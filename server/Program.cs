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
        
     
     //  Skickar in chatt till databasen
 app.MapPost("/api/chat/message", async (HttpContext context, ChatMessage message, NpgsqlDataSource db) =>
{
    try
    {
        
        
// Kontrollerar om användaren är inloggad (personal/admin)
        
        var isLoggedIn = context.Session.GetString("userId") != null;
        var userFirstName = context.Session.GetString("userFirstName");
        
        Console.WriteLine($"Processing chat message. IsLoggedIn: {isLoggedIn}, UserFirstName: {userFirstName}");
        Console.WriteLine($"Original message sender: {message.Sender}");
        
        // Om användaren är inloggad som personal/admin, skriv över avsändaren(kunden) med användarens namn från sessionen
        if (isLoggedIn && !string.IsNullOrEmpty(userFirstName))
        {
            // Save original sender for logging
            var originalSender = message.Sender;
            message.Sender = userFirstName;
            Console.WriteLine($"Changed sender from '{originalSender}' to '{userFirstName}' (logged in user)");
        }
        else
        {
            // icke-inloggade användare, vi behöver kontrollera om de är den ursprungliga kunden
            await using var checkCmd = db.CreateCommand(@"
                SELECT sender FROM chat_messages 
                WHERE chat_token = @chat_token 
                ORDER BY submitted_at ASC LIMIT 1");
                
            checkCmd.Parameters.AddWithValue("chat_token", message.ChatToken);
            
            var originalSender = await checkCmd.ExecuteScalarAsync() as string;
            
            // // Om vi hittade den ursprungliga kunden, använd det namnet konsekvent för icke inloggade användare.
            if (!string.IsNullOrEmpty(originalSender))
            {
                // Save current sender for logging
                var currentSender = message.Sender;
                message.Sender = originalSender;
                Console.WriteLine($"Changed sender from '{currentSender}' to '{originalSender}' (original submitter)");
            }
        }

        // Lägg nu in meddelandet med rätt avsändare
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
 
          // Hämtar chattmeddelanden från databasen
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
        
                //  Chat owner är den som skickade det första meddelandet, alltså kunden
                string chatOwner = null;
                if (messages.Count > 0)
                {
                    // Hämta första meddelandets avsändare som kunden skickat in
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
        
        
        
        // Lägger till användare i databasen
        app.MapPost("/api/users", async (UserForm user, NpgsqlDataSource db, IEmailService emailService) =>
        {
            try
            {
                // Determine role_id based on role
                int roleId = user.Role?.ToLower() switch
                {
                    "super-admin" => 3,    // Super-admin
                    "admin" => 2,     // Företags-admin
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
                    message = "Användare kunde inte skapas", 
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
        
              
        // Hämtar ut tickets från view initalform messages och placerar dem i respektive företag
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
              var  cmd = db.CreateCommand("select chat_token, message, sender, submitted_at, issue_type, email, form_type from initial_form_messages WHERE form_type = @usercompany"); // Skapar en SQL-fråga för att hämta ärenden
                cmd.Parameters.AddWithValue("usercompany", userCompany);
                
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

              

        app.MapPost("/api/tickets/archive", async (HttpContext httpContext, NpgsqlDataSource db) =>
        {
            try
            {
                Console.WriteLine("Archiving ticket request received");
                
                // Get the ticket data from the request body
                var reader = new StreamReader(httpContext.Request.Body);
                var body = await reader.ReadToEndAsync();
                Console.WriteLine($"Request body: {body}");
                
                var ticket = JsonSerializer.Deserialize<JsonElement>(body);

                // 1. Archive the ticket
                using (var cmd = db.CreateCommand())
                {
                    cmd.CommandText = @"
                        INSERT INTO archived_tickets 
                        (original_id, original_table, form_type, first_name, email, service_type, issue_type, 
                         message, chat_token, submitted_at, resolved_at, company_type, resolution_notes)
                        VALUES 
                        (1, 'initial_form_messages', @form_type, @first_name, @email, @service_type, @issue_type, 
                         @message, @chat_token, @submitted_at, @resolved_at, @company_type, @resolution_notes)";
                    
                    // Set parameters...
                    cmd.Parameters.AddWithValue("@form_type", ticket.TryGetProperty("formType", out var formType) ? formType.GetString() : "Unknown");
                    cmd.Parameters.AddWithValue("@first_name", ticket.TryGetProperty("firstName", out var firstName) ? firstName.GetString() : "Unknown");
                    cmd.Parameters.AddWithValue("@email", ticket.TryGetProperty("email", out var email) ? email.GetString() : "no-email@example.com");
                    cmd.Parameters.AddWithValue("@service_type", ticket.TryGetProperty("serviceType", out var serviceType) ? serviceType.GetString() : "");
                    cmd.Parameters.AddWithValue("@issue_type", ticket.TryGetProperty("issueType", out var issueType) ? issueType.GetString() : "Unknown Issue");
                    cmd.Parameters.AddWithValue("@message", ticket.TryGetProperty("message", out var message) ? message.GetString() : "");
                    cmd.Parameters.AddWithValue("@chat_token", ticket.TryGetProperty("chatToken", out var chatToken) ? chatToken.GetString() : Guid.NewGuid().ToString());
                    cmd.Parameters.AddWithValue("@submitted_at", DateTime.UtcNow.AddDays(-1)); // Default to yesterday
                    cmd.Parameters.AddWithValue("@resolved_at", DateTime.UtcNow); // Default to now
                    cmd.Parameters.AddWithValue("@company_type", ticket.TryGetProperty("companyType", out var companyType) ? companyType.GetString() : "");
                    cmd.Parameters.AddWithValue("@resolution_notes", ticket.TryGetProperty("resolutionNotes", out var resolutionNotes) ? resolutionNotes.GetString() : "Closed from dashboard");

                    await cmd.ExecuteNonQueryAsync();
                }
        // Inside your /api/tickets/archive endpoint, modify the table update section:

        // 2. Now update is_chat_active in the appropriate form table
        if (ticket.TryGetProperty("chatToken", out var tokenElement) && 
            tokenElement.ValueKind != JsonValueKind.Null)
        {
            string chatToken = tokenElement.GetString();
            
            // Determine which table to update based on form type
            string tableToUpdate = "initial_form_messages"; // Default fallback
            
            if (ticket.TryGetProperty("determineTable", out var tableProperty) && 
                tableProperty.ValueKind != JsonValueKind.Null)
            {
                string requestedTable = tableProperty.GetString();
                // Only allow specific tables to prevent SQL injection
                if (requestedTable == "fordon_forms" || 
                    requestedTable == "tele_forms" || 
                    requestedTable == "forsakrings_forms")
                {
                    tableToUpdate = requestedTable;
                }
            }
            else if (ticket.TryGetProperty("formType", out var formTypeProperty))
            {
                string formType = formTypeProperty.GetString();
                // Map form type to table name
                if (formType == "Fordonsservice") tableToUpdate = "fordon_forms";
                else if (formType == "Tele/Bredband") tableToUpdate = "tele_forms";
                else if (formType == "Försäkringsärende") tableToUpdate = "forsakrings_forms";
            }
            
            Console.WriteLine($"Updating is_chat_active to false in table {tableToUpdate} for chat token {chatToken}");
            
            // Only update is_chat_active if the table has that column
            if (tableToUpdate != "initial_form_messages") {
                using (var cmd = db.CreateCommand())
                {
                    cmd.CommandText = $"UPDATE {tableToUpdate} SET is_chat_active = false WHERE chat_token = @chatToken";
                    cmd.Parameters.AddWithValue("@chatToken", chatToken);
                    
                    int rowsUpdated = await cmd.ExecuteNonQueryAsync();
                    Console.WriteLine($"Updated {rowsUpdated} rows in {tableToUpdate}");
                }
            } else {
                Console.WriteLine("Skipping is_chat_active update for initial_form_messages (column doesn't exist)");
            }
        }

                Console.WriteLine("Ticket archived successfully");
                return Results.Ok(new { message = "Ticket archived successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error archiving ticket: {ex.Message}");
                return Results.BadRequest(new { message = "Failed to archive ticket", error = ex.Message });
            }
        });

        app.Run(); // Startar webbservern
    }
    
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