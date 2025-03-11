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
        NpgsqlDataSource postgresdb = NpgsqlDataSource.Create("Host=45.10.162.204;Port=5438;Database=test_db;Username=postgres;Password=_FrozenPresidentSmacks!;");
        var builder = WebApplication.CreateBuilder(args); // Skapar en WebApplicationBuilder
 
 
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
        // Lägg till middleware för debugging (kan tas bort i produktion)
       
        
        
        app.MapPost("/api/chat/message", async (ChatMessage message, NpgsqlDataSource db) =>
        {
            try
            {
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
        
        app.MapPut("/api/users/{userId}", async (int userId, UserForm user, NpgsqlDataSource db) =>
        {
            try
            {
                await using var cmd = db.CreateCommand(@"
                UPDATE users 
                SET first_name = @first_name, 
                password = CASE WHEN @password = '' THEN password ELSE @password END,
                company = @company,
                role_id = @role_id
                WHERE ""Id"" = @userId
                RETURNING ""Id"", first_name, company, role_id;");

                cmd.Parameters.AddWithValue("userId", userId);
                cmd.Parameters.AddWithValue("first_name", user.FirstName);
                cmd.Parameters.AddWithValue("password", user.Password);
                cmd.Parameters.AddWithValue("company", user.Company);
                cmd.Parameters.AddWithValue("role_id", user.Role == "admin" ? 2 : 1);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return Results.Ok(new
                    {
                        message = "Användare uppdaterad",
                        user = new
                        {
                            Id = reader.GetInt32(0),
                            FirstName = reader.GetString(1),
                            Company = reader.GetString(2),
                            Role = reader.GetInt32(3) == 1 ? "staff" : "admin"
                        }
                    });
                }

                return Results.NotFound(new { message = "Användare hittades inte" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new
                {
                    message = "Kunde inte uppdatera användare",
                    error = ex.Message
                });
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
                userCompany = "Försäkringsärende";
                
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
        
                // Ändra SQL-frågan för att ignorera skiftläge och trimma whitespace
                await using var cmd = db.CreateCommand(@"
            SELECT ""Id"", first_name, company, role_id, email
            FROM users
            WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(@username)) 
            AND password = @password");

                cmd.Parameters.AddWithValue("username", loginRequest.Username);
                cmd.Parameters.AddWithValue("password", loginRequest.Password);

                await using var reader = await cmd.ExecuteReaderAsync();
        
                if (await reader.ReadAsync())
                {
                    var user = new
                    {
                        id = reader.GetInt32(0),
                        username = reader.GetString(1),
                        company = reader.GetString(2),
                        role = reader.GetInt32(3) == 1 ? "staff" : 
                            reader.GetInt32(3) == 2 ? "user" : "admin",
                        email = reader.GetValue(4)?.ToString() ?? ""
                    };
                    context.Session.SetString("userCompany", user.company);
                    Console.WriteLine($"Inloggning lyckades för användare: {user.username}");
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