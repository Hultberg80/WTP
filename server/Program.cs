using server.Services;
using server.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;
using Microsoft.AspNetCore.Http.Json;

namespace server;

public class LoginRequest
{
    public LoginRequest(string username, string password)
    {
        Username = username;
        Password = password;
    }

    public string Username { get; set; }
    public string Password { get; set; }
}

public class Program // Deklarerar huvudklassen Program
{
    public static void Main(string[] args) // Deklarerar huvudmetoden Main
    {
        var builder = WebApplication.CreateBuilder(args); // Skapar en WebApplicationBuilder
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        NpgsqlDataSource postgresdb = NpgsqlDataSource.Create(connectionString);
        
        
        builder.Services.AddSingleton<NpgsqlDataSource>(postgresdb);
 
        builder.Services.AddDistributedMemoryCache(); // Required for session state
        builder.Services.AddSession(options =>
        {
            options.IdleTimeout = TimeSpan.FromMinutes(30); // Set session timeout
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
        });
 
 
        builder.Services.AddScoped<IEmailService, EmailService>(); // Registrerar EmailService som en scopad tjänst
 
        var app = builder.Build(); // Bygger WebApplication-instansen
        app.UseSession(); // Required for session state
        
        
        
 app.MapPost("/api/chat/message", async (HttpContext context, ChatMessage message, NpgsqlDataSource db) =>
{
    try
    {
        // Check if user is logged in (staff/admin)
        var isLoggedIn = context.Session.GetString("userId") != null;
        var userFirstName = context.Session.GetString("userFirstName");
        
        Console.WriteLine($"Processing chat message. IsLoggedIn: {isLoggedIn}, UserFirstName: {userFirstName}");
        Console.WriteLine($"Original message sender: {message.Sender}");
        
        // If user is logged in as staff/admin, override the sender with the user's name from session
        if (isLoggedIn && !string.IsNullOrEmpty(userFirstName))
        {
            // Save original sender for logging
            var originalSender = message.Sender;
            message.Sender = userFirstName;
            Console.WriteLine($"Changed sender from '{originalSender}' to '{userFirstName}' (logged in user)");
        }
        else
        {
            // For non-logged in users, we need to check if they're the original form submitter
            await using var checkCmd = db.CreateCommand(@"
                SELECT sender FROM chat_messages 
                WHERE chat_token = @chat_token 
                ORDER BY submitted_at ASC LIMIT 1");
                
            checkCmd.Parameters.AddWithValue("chat_token", message.ChatToken);
            
            var originalSender = await checkCmd.ExecuteScalarAsync() as string;
            
            // If we found the original sender, use that name consistently for non-logged in users
            if (!string.IsNullOrEmpty(originalSender))
            {
                // Save current sender for logging
                var currentSender = message.Sender;
                message.Sender = originalSender;
                Console.WriteLine($"Changed sender from '{currentSender}' to '{originalSender}' (original submitter)");
            }
        }

        // Now insert the message with the correct sender
        await using var cmd = db.CreateCommand(@"
            INSERT INTO chat_messages (chat_token, sender, message, submitted_at)
            VALUES (@chat_token, @sender, @message, @submitted_at)
            RETURNING id, sender, message, submitted_at, chat_token");
 
        cmd.Parameters.AddWithValue("chat_token", message.ChatToken);
        cmd.Parameters.AddWithValue("sender", message.Sender);
        cmd.Parameters.AddWithValue("message", message.Message);
        cmd.Parameters.AddWithValue("submitted_at", DateTime.UtcNow);
 
        await using var reader = await cmd.ExecuteReaderAsync();
        
        if (await reader.ReadAsync())
        {
            var createdMessage = new {
                id = reader.GetInt32(0),
                sender = reader.GetString(1),
                message = reader.GetString(2),
                timestamp = reader.GetDateTime(3),
                chatToken = reader.GetString(4)
            };
            
            return Results.Ok(createdMessage);
        }
        
        return Results.BadRequest(new { message = "Message could not be created" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Could not send message", error = ex.Message });
    }
});
 

        app.MapGet("/api/chat/messages/{chatToken}", async (string chatToken, NpgsqlDataSource db) =>
        {
            try
            {
                List<object> messages = new();
        
             await using var cmd = db.CreateCommand(@"
            SELECT id, sender, message, submitted_at, chat_token
            FROM chat_messages 
            WHERE chat_token = @chat_token
            ORDER BY submitted_at ASC");
        
                cmd.Parameters.AddWithValue("chat_token", chatToken);
        
               await using var reader = await cmd.ExecuteReaderAsync();
        
                while (await reader.ReadAsync())
                {
                    messages.Add(new
                    {
                        id = reader.GetInt32(0),
                        sender = reader.GetString(1),
                        message = reader.GetString(2),
                        timestamp = reader.GetDateTime(3),
                        chatToken = reader.GetString(4)
                    });
                }
        
                // Also get the chat "owner" (first unique sender)
                string chatOwner = null;
                if (messages.Count > 0)
                {
                    // Assuming the first message's sender is the chat owner
                    chatOwner = ((dynamic)messages[0]).sender;
                }
        
                return Results.Ok(new { 
                    messages, 
                    chatOwner 
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Could not fetch messages", error = ex.Message });
            }
        });
        
        
        
        

        // User Endpoints
        app.MapPost("/api/users", async (UserForm user, NpgsqlDataSource db, IEmailService emailService) =>
        {
            try
            {
                // Determine role_id based on role
                int roleId = user.Role?.ToLower() switch
                {
                    "admin" => 3,    // Super-admin
                    "user" => 2,     // Företags-admin
                    "staff" => 1,    // Kundtjänst
                    _ => 1           // Default to staff
                };


                user.CreatedAt = DateTime.UtcNow;
               await using var cmd = db.CreateCommand(@"
                    INSERT INTO users (first_name, password, company, created_at, role_id, email)
                    VALUES (@first_name, @password, @company, @created_at, @role_id, @email)
                    RETURNING ""Id"", first_name, company, created_at;");

                cmd.Parameters.AddWithValue("first_name", user.FirstName);
                cmd.Parameters.AddWithValue("password", user.Password);
                cmd.Parameters.AddWithValue("company", user.Company);
                cmd.Parameters.AddWithValue("created_at", user.CreatedAt);
                cmd.Parameters.AddWithValue("role_id", roleId);
                cmd.Parameters.AddWithValue("email", user.Email);

               await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    await emailService.SendChangePasswordLink(
                        user.Email,
                        user.FirstName,
                        user.Password
                    );
                    
                    return Results.Ok(new
                    {
                        message = "Användare skapad",
                        user = new
                        {
                            Id = reader.GetInt32(0),
                            FirstName = reader.GetString(1),
                            Company = reader.GetString(2),
                            CreatedAt = reader.GetDateTime(3),
                     
                        }
                    });
                }

                return Results.BadRequest(new { message = "Kunde inte skapa användare" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new
                {
                    message = "Användare skapad", // Gris
                    error = ex.Message
                });
            }
        });
        
        app.MapPost("/api/chat/end/{chatToken}", async (string chatToken, NpgsqlDataSource db) =>
        {
            try
            {
                await using var cmd = db.CreateCommand(@"
            UPDATE fordon_forms SET is_chat_active = FALSE WHERE chat_token = @chat_token;
            UPDATE tele_forms SET is_chat_active = FALSE WHERE chat_token = @chat_token;
            UPDATE forsakrings_forms SET is_chat_active = FALSE WHERE chat_token = @chat_token;
        ");

                cmd.Parameters.AddWithValue("chat_token", chatToken);
                var rowsAffected = await cmd.ExecuteNonQueryAsync();

                if (rowsAffected > 0)
                {
                    return Results.Ok(new { message = "Chatten avslutades" });
                }

                return Results.NotFound(new { message = "Chatten hittades inte" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte avsluta chatten", error = ex.Message });
            }
        });

        app.MapPost("/api/chat/rate/{chatToken}", async (string chatToken, HttpContext context, NpgsqlDataSource db) =>
        {
            try
            {
                // Logga inkommande förfrågan
                Console.WriteLine($"Mottagen rating-request för chatToken: {chatToken}");

                var requestBody = await context.Request.ReadFromJsonAsync<ChatRatingRequest>();
        
                // Logga inkommande data
                Console.WriteLine($"Betyg: {requestBody?.Rating}, Feedback: {requestBody?.Feedback}");

                if (requestBody == null || requestBody.Rating < 1 || requestBody.Rating > 5)
                {
                    return Results.BadRequest(new { message = "Ogiltigt betyg" });
                }

                await using var cmd = db.CreateCommand(@"
            INSERT INTO chat_ratings (chat_token, rating, feedback, submitted_at)
            VALUES (@chat_token, @rating, @feedback, @submitted_at)");

                cmd.Parameters.AddWithValue("chat_token", chatToken);
                cmd.Parameters.AddWithValue("rating", requestBody.Rating);
                cmd.Parameters.AddWithValue("feedback", requestBody.Feedback ?? "");
                cmd.Parameters.AddWithValue("submitted_at", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                Console.WriteLine("Betyg sparat i databasen");

                return Results.Ok(new { message = "Betyg sparat" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fel vid betygsändning: {ex.Message}");
                return Results.BadRequest(new { message = "Kunde inte spara betyget", error = ex.Message });
            }
        });

        

        app.MapGet("/api/users", async (NpgsqlDataSource db) => // Mappar GET-begäran för att hämta alla användare
        {
            List<UserForm> users = new(); // Skapar en lista för att lagra användare
            
            await using var cmd = db.CreateCommand("SELECT users.\"Id\" as \"id\", users.first_name, users.company, users.role_id, users.email FROM users\n"); // Skapar en SQL-fråga för att hämta användare
            var reader = await cmd.ExecuteReaderAsync(); // Utför SQL-frågan och läser resultatet
            
            while (await reader.ReadAsync()) // Loopar igenom varje rad i resultatet
            {
                users.Add(new UserForm // Lägger till en ny användare i listan
                {
                    Id = reader.GetInt32(0), // Hämtar ID från resultatet
                    FirstName = reader.GetString(1), // Hämtar förnamn från resultatet
                    Company = reader.GetString(2), // Hämtar företag från resultatet
                    Role = reader.GetInt32(3) == 1 ? "staff" : "admin",
                    Email = reader.GetString(4)
                });
            }
            
            return Results.Ok(users); // Returnerar ett OK-resultat med användarna
        });
        
        app.MapDelete("/api/users/{userId}", async (int userId, NpgsqlDataSource db) =>
        {
            try
            {
                await using var cmd = db.CreateCommand(@"
                    DELETE FROM users 
                    WHERE ""Id"" = @userId");
            
                cmd.Parameters.AddWithValue("userId", userId);
        
                var rowsAffected = await cmd.ExecuteNonQueryAsync();
        
                if (rowsAffected > 0)
                {
                    return Results.Ok(new { message = "Användare borttagen" });
                }
        
                return Results.NotFound(new { message = "Användare hittades inte" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });
        
        app.MapPut("/api/users/{userId}", async (HttpContext context, UserForm user, NpgsqlDataSource db) =>
        {
            try
            {
                // Get current user's ID from session
                var currentUserId = context.Session.GetString("userId");
        
                await using var cmd = db.CreateCommand(@"
        UPDATE users 
        SET first_name = CASE WHEN @first_name = '' THEN first_name ELSE @first_name END,
            password = CASE WHEN @password = '' THEN password ELSE @password END
        WHERE ""Id"" = @userId AND ""Id"" = @currentUserId
        RETURNING ""Id"", first_name;");

                cmd.Parameters.AddWithValue("userId", int.Parse(currentUserId));
                cmd.Parameters.AddWithValue("currentUserId", int.Parse(currentUserId));
                cmd.Parameters.AddWithValue("first_name", user.FirstName);
                cmd.Parameters.AddWithValue("password", user.Password);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    // Update session with new name if changed
                    if (!string.IsNullOrEmpty(user.FirstName))
                    {
                        context.Session.SetString("userFirstName", user.FirstName);
                    }

                    return Results.Ok(new
                    {
                        message = "Uppgifterna uppdaterades framgångsrikt",
                        user = new
                        {
                            Id = reader.GetInt32(0),
                            FirstName = reader.GetString(1)
                        }
                    });
                }

                return Results.NotFound(new { message = "Användare hittades inte" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        
        // Fordon Form Endpoints
app.MapPost("/api/fordon", async (FordonForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config, ILogger<Program> logger) =>
{
    // Skapa en anslutning som vi kan använda för transaktioner
    await using var connection = await db.OpenConnectionAsync();
    await using var transaction = await connection.BeginTransactionAsync();
    
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO fordon_forms (first_name, email, reg_nummer, issue_type, message, chat_token, submitted_at, is_chat_active, company_type)
            VALUES (@first_name, @email, @reg_nummer, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)", connection, transaction);

        cmd.Parameters.AddWithValue("first_name", submission.FirstName);
        cmd.Parameters.AddWithValue("email", submission.Email);
        cmd.Parameters.AddWithValue("reg_nummer", submission.RegNummer);
        cmd.Parameters.AddWithValue("issue_type", submission.IssueType);
        cmd.Parameters.AddWithValue("message", submission.Message);
        cmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        cmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
        cmd.Parameters.AddWithValue("is_chat_active", submission.IsChatActive);
        cmd.Parameters.AddWithValue("company_type", submission.CompanyType);

        await cmd.ExecuteNonQueryAsync();

        await using var chatCmd = new NpgsqlCommand(@"
            INSERT INTO chat_messages ( sender, message, submitted_at, chat_token)
            VALUES ( @sender, @message, @submitted_at, @chat_token)", connection, transaction);

       
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
        chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);

        await chatCmd.ExecuteNonQueryAsync();
        
        // Slutför transaktionen
        await transaction.CommitAsync();

        // Skapa chattlänk efter lyckad databastransaktion
        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        bool emailSent = await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        logger.LogInformation(
            "Fordon form submitted successfully. Email sent: {EmailSent}. ChatToken: {ChatToken}", 
            emailSent, 
            submission.ChatToken
        );

        return Results.Ok(new {
            success = true,
            message = emailSent
                ? "Formulär skickat! Kolla din e-post för chattlänken."
                : "Formulär skickat! Men e-post med chattlänken kunde inte skickas, du kan fortfarande nå chatten via denna länk.",
            submission,
            chatLink
        });
    }
    catch (Exception ex)
    {
        // Rulla tillbaka transaktionen om något går fel
        await transaction.RollbackAsync();
        
        logger.LogError(ex, "Fel när ett Fordonformulär skulle sparas: {Message}", ex.Message);
        return Results.BadRequest(new { 
            success = false,
            message = "Ett fel uppstod när formuläret skulle sparas. Försök igen senare.", 
            error = ex.Message 
        });
    }
});

// Tele Form Endpoints
app.MapPost("/api/tele", async (TeleForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config, ILogger<Program> logger) =>
{
    // Skapa en anslutning som vi kan använda för transaktioner
   await using var connection = await db.OpenConnectionAsync();
   await using var transaction = await connection.BeginTransactionAsync();
    
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO tele_forms (first_name, email, service_type, issue_type, message, chat_token, submitted_at, is_chat_active, company_type)
            VALUES (@first_name, @email, @service_type, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)", connection, transaction);

        cmd.Parameters.AddWithValue("first_name", submission.FirstName);
        cmd.Parameters.AddWithValue("email", submission.Email);
        cmd.Parameters.AddWithValue("service_type", submission.ServiceType);
        cmd.Parameters.AddWithValue("issue_type", submission.IssueType);
        cmd.Parameters.AddWithValue("message", submission.Message);
        cmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        cmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
        cmd.Parameters.AddWithValue("is_chat_active", submission.IsChatActive);
        cmd.Parameters.AddWithValue("company_type", submission.CompanyType);

        await cmd.ExecuteNonQueryAsync();

        await using var chatCmd = new NpgsqlCommand(@"
            INSERT INTO chat_messages ( sender, message, submitted_at, chat_token)
            VALUES ( @sender, @message, @submitted_at, @chat_token)", connection, transaction);

       
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
         chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        await chatCmd.ExecuteNonQueryAsync();
        
        // Slutför transaktionen
        await transaction.CommitAsync();

        // Skapa chattlänk efter lyckad databastransaktion
        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        bool emailSent = await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        logger.LogInformation(
            "Tele form submitted successfully. Email sent: {EmailSent}. ChatToken: {ChatToken}", 
            emailSent, 
            submission.ChatToken
        );

        return Results.Ok(new {
            success = true,
            message = emailSent
                ? "Formulär skickat! Kolla din e-post för chattlänken."
                : "Formulär skickat! Men e-post med chattlänken kunde inte skickas, du kan fortfarande nå chatten via denna länk.",
            submission,
            chatLink
        });
    }
    catch (Exception ex)
    {
        // Rulla tillbaka transaktionen om något går fel
        await transaction.RollbackAsync();
        
        logger.LogError(ex, "Fel när ett Teleformulär skulle sparas: {Message}", ex.Message);
        return Results.BadRequest(new { 
            success = false,
            message = "Ett fel uppstod när formuläret skulle sparas. Försök igen senare.", 
            error = ex.Message 
        });
    }
});

// Forsakring Form Endpoints
app.MapPost("/api/forsakring", async (ForsakringsForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config, ILogger<Program> logger) =>
{
    // Skapa en anslutning som vi kan använda för transaktioner
    await using var connection = await db.OpenConnectionAsync();
    await using var transaction = await connection.BeginTransactionAsync();
    
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO forsakrings_forms (first_name, email, insurance_type, issue_type, message, chat_token, submitted_at, is_chat_active, company_type)
            VALUES (@first_name, @email, @insurance_type, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)", connection, transaction);

        cmd.Parameters.AddWithValue("first_name", submission.FirstName);
        cmd.Parameters.AddWithValue("email", submission.Email);
        cmd.Parameters.AddWithValue("insurance_type", submission.InsuranceType);
        cmd.Parameters.AddWithValue("issue_type", submission.IssueType);
        cmd.Parameters.AddWithValue("message", submission.Message);
        cmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        cmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
        cmd.Parameters.AddWithValue("is_chat_active", submission.IsChatActive);
        cmd.Parameters.AddWithValue("company_type", submission.CompanyType);

        await cmd.ExecuteNonQueryAsync();

        await using var chatCmd = new NpgsqlCommand(@"
            INSERT INTO chat_messages ( sender, message, submitted_at, chat_token)
            VALUES ( @sender, @message, @submitted_at, @chat_token)", connection, transaction);

       
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);
        chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);

        await chatCmd.ExecuteNonQueryAsync();
        
        // Slutför transaktionen
        await transaction.CommitAsync();

        // Skapa chattlänk efter lyckad databastransaktion
        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        bool emailSent = await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        logger.LogInformation(
            "Försäkrings form submitted successfully. Email sent: {EmailSent}. ChatToken: {ChatToken}", 
            emailSent, 
            submission.ChatToken
        );

        return Results.Ok(new {
            success = true,
            message = emailSent
                ? "Formulär skickat! Kolla din e-post för chattlänken."
                : "Formulär skickat! Men e-post med chattlänken kunde inte skickas, du kan fortfarande nå chatten via denna länk.",
            submission,
            chatLink
        });
    }
    catch (Exception ex)
    {
        // Rulla tillbaka transaktionen om något går fel
        await transaction.RollbackAsync();
        
        logger.LogError(ex, "Fel när ett Försäkringsformulär skulle sparas: {Message}", ex.Message);
        return Results.BadRequest(new { 
            success = false,
            message = "Ett fel uppstod när formuläret skulle sparas. Försök igen senare.", 
            error = ex.Message 
        });
    }
});

        // Initial Message Endpoints
        app.MapPost("/api/initial-message", async (InitialMessage message, NpgsqlDataSource db) =>
        {
            try
            {
               await using var cmd = db.CreateCommand(@"
                    INSERT INTO initial_form_messages (chat_token, sender, message, submitted_at, issue_type, email, form_type)
                    VALUES (@chat_token, @sender, @message, @submitted_at, @issue_type, @email, @form_type)");

                cmd.Parameters.AddWithValue("chat_token", message.ChatToken);
                cmd.Parameters.AddWithValue("sender", message.Sender);
                cmd.Parameters.AddWithValue("message", message.Message);
                cmd.Parameters.AddWithValue("submitted_at", DateTime.UtcNow);
                cmd.Parameters.AddWithValue("issue_type", message.IssueType);
                cmd.Parameters.AddWithValue("email", message.Email);
                cmd.Parameters.AddWithValue("form_type", message.FormType);

                await cmd.ExecuteNonQueryAsync();

                return Results.Ok(new { message = "Initial message created" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Could not create initial message", error = ex.Message });
            }
        });

         // Hämta första meddelandet från formulär via chatToken
        app.MapGet("/api/initial-message/{chatToken}", async (string chatToken, NpgsqlDataSource db) =>
        {
            try
            {
               await using var cmd = db.CreateCommand(@"
                    SELECT chat_token, sender, message, submitted_at, issue_type, email, form_type 
                    FROM initial_form_messages 
                    WHERE chat_token = @chat_token");

                cmd.Parameters.AddWithValue("chat_token", chatToken);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var initialMessage = new
                    {
                        chatToken = reader.GetString(0),
                        sender = reader.GetString(1),
                        message = reader.GetString(2),
                        submittedAt = reader.GetDateTime(3),
                        issueType = reader.GetString(5),
                        formType = reader.GetString(6)
                    };

                    return Results.Ok(initialMessage);
                }

                return Results.NotFound("No initial message found with this chat token");
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Could not fetch initial message", error = ex.Message });
            }
        });
              
        // Tickets endpoint
        app.MapGet("/api/tickets",(Delegate)GetTickets); // Mappar GET-begäran för att hämta ärenden
        async Task <IResult> GetTickets(HttpContext context, NpgsqlDataSource db)
        {
            var userCompany = context.Session.GetString("userCompany");
            if (userCompany == "fordon")
            {
                userCompany = "Fordonsservice";
                
            } else if (userCompany == "tele")
            {
                userCompany = "Tele/Bredband";
                
            } else if (userCompany == "forsakring")
            {
                userCompany = "Försäkringsärenden";
                
            }
            Console.WriteLine($"userCompany: {userCompany}");
            List<GetTicketsDTO> tickets = new();
            try
            {
              var  cmd = db.CreateCommand("select chat_token, message, sender, submitted_at, issue_type, email, form_type from initial_form_messages WHERE form_type = @vadfanduvill"); // Skapar en SQL-fråga för att hämta ärenden
                cmd.Parameters.AddWithValue("vadfanduvill", userCompany);
                
               var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    tickets.Add(new(
                        reader.GetString(0),
                        reader.GetString(0),
                        reader.GetString(1),
                        reader.GetString(2),
                        reader.GetDateTime(3),
                        reader.GetString(4),
                        reader.GetString(5),
                         reader.GetString(6)
                    ));
                }
                
                return Results.Ok(tickets); // Returnerar ett OK-resultat med ärendena
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new
                {
                    message = "Kunde inte hämta ärenden", error = ex.Message
                }); // Returnerar ett BadRequest-resultat vid fel
            }
        };
        
        
app.MapPost("/api/login", async (HttpContext context, LoginRequest loginRequest, NpgsqlDataSource db) =>
{
    try
    {
        Console.WriteLine($"Inloggningsförsök: {loginRequest.Username}, {loginRequest.Password}");
        
        // Query that accepts both email and first_name as login identifiers
        await using var cmd = db.CreateCommand(@"
            SELECT ""Id"", first_name, company, role_id, email
            FROM users
            WHERE (email = @login_id OR LOWER(TRIM(first_name)) = LOWER(TRIM(@login_id)))
            AND password = @password");

        cmd.Parameters.AddWithValue("login_id", loginRequest.Username);
        cmd.Parameters.AddWithValue("password", loginRequest.Password);

        await using var reader = await cmd.ExecuteReaderAsync();
        
        if (await reader.ReadAsync())
        {
            var userId = reader.GetInt32(0);
            var firstName = reader.GetString(1);
            var company = reader.GetString(2);
            
            // Handle potential NULL values for role_id
            int roleId = reader.IsDBNull(3) ? 1 : reader.GetInt32(3); // Default to 1 (Staff) if NULL
            var email = reader.GetString(4);
            
            // Map role_id to the correct role based on your database structure
            string roleName = roleId switch
            {
                1 => "staff",     // ID 1 is Staff
                2 => "admin",     // ID 2 is Admin
                3 => "admin",     // ID 3 is Super-Admin (treated as admin in your app)
                _ => "staff"      // Default to staff for any other value
            };
            
            // Store user info in session
            context.Session.SetString("userId", userId.ToString());
            context.Session.SetString("userFirstName", firstName);
            context.Session.SetString("userCompany", company);
            context.Session.SetString("userRole", roleName);
            context.Session.SetString("userEmail", email);
            
            Console.WriteLine($"Inloggning lyckades för användare: {firstName}, Roll: {roleName}, Företag: {company}");
            
            var user = new
            {
                id = userId,
                username = firstName,
                company = company,
                role = roleName,
                email = email
            };
            
            return Results.Ok(new { success = true, user });
        }
        
        Console.WriteLine("Inloggning misslyckades: Användare hittades inte");
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Inloggningsfel: {ex.Message}");
        return Results.BadRequest(new { message = "Inloggningen misslyckades", error = ex.Message });
    }
});

app.MapGet("/api/chat/auth-status", (HttpContext context) =>
{
    var userId = context.Session.GetString("userId");
    var userFirstName = context.Session.GetString("userFirstName");
    var userRole = context.Session.GetString("userRole");
    
    Console.WriteLine($"Auth status check: UserId={userId}, UserFirstName={userFirstName}, UserRole={userRole}");
    
    return Results.Ok(new { 
        isLoggedIn = !string.IsNullOrEmpty(userId),
        firstName = userFirstName ?? "",
        role = userRole ?? ""
    });
});

app.MapPost("/api/logout", (HttpContext context) =>
{
    try
    {
        // Log who is logging out
        var userId = context.Session.GetString("userId");
        var userName = context.Session.GetString("userFirstName");
        
        Console.WriteLine($"Logging out user: ID={userId}, Name={userName}");
        
        // Clear all session data
        context.Session.Clear();
        
        Console.WriteLine("Session cleared successfully");
        
        return Results.Ok(new { success = true, message = "Utloggad" });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Logout error: {ex.Message}");
        return Results.BadRequest(new { success = false, message = "Kunde inte logga ut", error = ex.Message });
    }
});

        app.Run(); // Startar webbservern
    }
    
    

    public record GetTicketsDTO(
        string ChatToken,
        string Id,
        string Message,
        string Sender,
        DateTime Timestamp,
        string IssueType,
        string Email,
        string FormType);
}