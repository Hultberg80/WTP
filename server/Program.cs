
using server.Services; // Importerar server.Services för att få tillgång till EmailService
using server.Models; // Importerar server.Models för att få tillgång till datamodeller
using System.Text.Json; // Importerar System.Text.Json för JSON-serialisering
using Npgsql;
namespace server; // Deklarerar namnrymden för serverprojektet

public class Program // Deklarerar huvudklassen Program
{
    public static void Main(string[] args) // Deklarerar huvudmetoden Main
    {
        NpgsqlDataSource postgresdb = NpgsqlDataSource.Create("Host=aws-0-eu-north-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.mwuzqdjbcmwyyftrdesb;Password=Mandelmassa25;Include Error Detail=true;Command Timeout=60;SSL Mode=Require;Trust Server Certificate=true");
        var builder = WebApplication.CreateBuilder(args); // Skapar en WebApplicationBuilder
        
        builder.Services.AddEndpointsApiExplorer(); // Lägger till API Explorer för Swagger
        builder.Services.AddSwaggerGen(); // Lägger till Swagger-generering
        builder.Services.AddAuthentication(); // Lägger till autentiseringsstöd
        builder.Services.AddAuthorization(); // Lägger till auktoriseringsstöd
        builder.Services.AddSingleton <NpgsqlDataSource>(postgresdb);
        
        builder.Services.AddCors(options => // Lägger till CORS-stöd
        {
            options.AddPolicy("AllowReactApp", // Definierar en CORS-policy för React-appen
                builder =>
                {
                    builder
                        .WithOrigins( // Anger tillåtna ursprung för CORS
                            "http://localhost:3001",
                            "https://localhost:3001"
                        )
                        .AllowAnyMethod() // Tillåter alla HTTP-metoder
                        .AllowAnyHeader(); // Tillåter alla HTTP-headers
                });
        });

        builder.Services.AddScoped<IEmailService, EmailService>(); // Registrerar EmailService som en scopad tjänst

        var app = builder.Build(); // Bygger WebApplication-instansen

        if (app.Environment.IsDevelopment()) // Kontrollerar om miljön är utvecklingsmiljö
        {
            app.UseSwagger(); // Aktiverar Swagger
            app.UseSwaggerUI(); // Aktiverar Swagger UI
        }

        app.UseHttpsRedirection(); // Aktiverar HTTPS-omdirigering
        app.UseCors("AllowReactApp"); // Använder CORS-policyn för React-appen
        app.UseAuthentication(); // Aktiverar autentisering
        app.UseAuthorization(); // Aktiverar auktorisering
        
       
        // User Endpoints
        app.MapPost("/api/users", async (UserForm user, NpgsqlDataSource db, IEmailService emailService) =>
        {
            try
            {
                // Existing role_id logic
                int roleId = user.Role?.ToLower() switch
                {
                    "admin" => 2,
                    "user" => 1,
                    "staff" => 1,
                    _ => 1 // Default to staff
                };

                user.CreatedAt = DateTime.UtcNow;

                using var cmd = db.CreateCommand(@"
    INSERT INTO users (first_name, password, company, created_at, role_id, email)
    VALUES (@first_name, @password, @company, @created_at, @role_id, @email)
    RETURNING first_name, company, created_at;");

                cmd.Parameters.AddWithValue("first_name", user.FirstName);
                cmd.Parameters.AddWithValue("password", user.Password);
                cmd.Parameters.AddWithValue("company", user.Company);
                cmd.Parameters.AddWithValue("created_at", user.CreatedAt);
                cmd.Parameters.AddWithValue("role_id", roleId);
                cmd.Parameters.AddWithValue("email", user.Email);

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    // Send welcome email with credentials
                    await emailService.SendUserCredentials(user.Email, user.FirstName, user.Password);

                    return Results.Ok(new
                    {
                        message = "Användare skapad",
                        user = new
                        {
                            FirstName = reader.GetString(0),
                            Company = reader.GetString(1),
                            CreatedAt = reader.GetDateTime(2)
                        }
                    });
                }
        
                return Results.BadRequest(new { message = "Kunde inte skapa användare" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new
                {
                    message = "Kunde inte skapa användare",
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        });



        app.MapGet("/api/users", async (NpgsqlDataSource db) => // Mappar GET-begäran för att hämta alla användare
        {
            List<UserForm> users = new(); // Skapar en lista för att lagra användare
            
            using var cmd = db.CreateCommand("SELECT users.\"Id\" as \"id\", users.first_name, users.company, users.role_id, users.email FROM users\n"); // Skapar en SQL-fråga för att hämta användare
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
                using var cmd = db.CreateCommand(@"
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
                using var cmd = db.CreateCommand(@"
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

                using var reader = await cmd.ExecuteReaderAsync();
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


        


        app.MapGet("/api/chat/latest/{chatToken}",
            async (string chatToken, NpgsqlDataSource db) =>
            {
                try
                {
                    using var cmd = db.CreateCommand(@"
                SELECT chat_token, sender, message, submitted_at
                FROM chat_messages 
                WHERE chat_token = @chat_token
                ORDER BY submitted_at DESC
                LIMIT 1");

                    cmd.Parameters.AddWithValue("chat_token", chatToken);

                    await using var reader = await cmd.ExecuteReaderAsync();
            
                    if (await reader.ReadAsync())
                    {
                        var message = new
                        {
                            chatToken = reader.GetString(0),
                            sender = reader.GetString(1),
                            message = reader.GetString(2),
                            submitted_at = reader.GetDateTime(3)
                        };

                        return Results.Ok(message);
                    }

                    return Results.NotFound("No message found");
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { message = "Kunde inte fetcha chat", error = ex.Message });
                }
            });

        app.MapPost("/api/chat/message", async (ChatMessage message, NpgsqlDataSource db) =>

        {

            try

            {

                using var cmd = db.CreateCommand(@"

            INSERT INTO chat_messages (chat_token, sender, message, submitted_at)

            VALUES (@chat_token, @sender, @message, @submitted_at)");
 
                cmd.Parameters.AddWithValue("chat_token", message.ChatToken);

                cmd.Parameters.AddWithValue("sender", message.Sender);

                cmd.Parameters.AddWithValue("message", message.Message);

                cmd.Parameters.AddWithValue("submitted_at", DateTime.UtcNow);
 
                await cmd.ExecuteNonQueryAsync();
 
                return Results.Ok(new { message = "Message sent successfully" });

            }

            catch (Exception ex)

            {

                return Results.BadRequest(new { message = "Could not send message", error = ex.Message });

            }

        });

            
                
       

        /*app.MapGet("/api/users/{id}",
            async (int id, AppDbContext db) => // Mappar GET-begäran för att hämta en användare baserat på ID
            {
                var user = await db.Users.FindAsync(id); // Söker efter användaren med det angivna ID:et asynkront
                return
                    user is null
                        ? Results.NotFound()
                        : Results.Ok(user); // Returnerar NotFound om användaren inte hittas, annars OK med användaren
            }); */

        // Fordon Form Endpoints
        
app.MapPost("/api/fordon", async (FordonForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config) =>
{
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        using var cmd = db.CreateCommand(@"
            INSERT INTO fordon_forms ( first_name,email , reg_nummer, issue_type, message, chat_token, submitted_at, is_chat_active, company_type)
            VALUES (@first_name, @email, @reg_nummer, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)");
        
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

        using var chatCmd = db.CreateCommand(@"
            INSERT INTO chat_messages (chat_token, sender, message, submitted_at)
            VALUES (@chat_token, @sender, @message, @submitted_at)");

        chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);

        await chatCmd.ExecuteNonQueryAsync();

        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        return Results.Ok(new { message = "Formulär skickat", submission });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
    }
});

        // Tele Form Endpoints
        
app.MapPost("/api/tele", async (TeleForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config) =>
{
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        using var cmd = db.CreateCommand(@"
            INSERT INTO tele_form (, first_name,email, service_type, issue_type, message ,chat_token ,submitted_at, is_chat_active,  company_type)
            VALUES (@chat_token, @first_name, @email, @service_type, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)");

        
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

        using var chatCmd = db.CreateCommand(@"
            INSERT INTO chat_messages (chat_token, sender, message, submitted_at)
            VALUES (@chat_token, @sender, @message, @submitted_at)");

        chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);

        await chatCmd.ExecuteNonQueryAsync();

        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        return Results.Ok(new { message = "Formulär skickat", submission });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
    }
});


        
        // Forsakring Form Endpoints
app.MapPost("/api/forsakring", async (ForsakringsForm submission, NpgsqlDataSource db, IEmailService emailService, IConfiguration config) =>
{
    try
    {
        submission.ChatToken = Guid.NewGuid().ToString();
        submission.SubmittedAt = DateTime.UtcNow;
        submission.IsChatActive = true;

        using var cmd = db.CreateCommand(@"
            INSERT INTO forsakrings_forms (first_name, email, insurance_type, issue_type, message, chat_token, submitted_at, is_chat_active, company_type)
            VALUES (@first_name, @email, @insurance_type, @issue_type, @message, @chat_token, @submitted_at, @is_chat_active, @company_type)");

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

        using var chatCmd = db.CreateCommand(@"
            INSERT INTO chat_messages (chat_token, sender, message, submitted_at)
            VALUES (@chat_token, @sender, @message, @submitted_at)");

        chatCmd.Parameters.AddWithValue("chat_token", submission.ChatToken);
        chatCmd.Parameters.AddWithValue("sender", submission.FirstName);
        chatCmd.Parameters.AddWithValue("message", submission.Message);
        chatCmd.Parameters.AddWithValue("submitted_at", submission.SubmittedAt);

        await chatCmd.ExecuteNonQueryAsync();

        var baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:3001";
        var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );

        return Results.Ok(new { message = "Formulär skickat", submission });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
    }
});
// Initial Message Endpoints
app.MapPost("/api/initial-message", async (InitialMessage message, NpgsqlDataSource db) =>
{
    try
    {
        using var cmd = db.CreateCommand(@"
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
        using var cmd = db.CreateCommand(@"
            SELECT chat_token, sender, message, submitted_at, issue_type, email, form_type 
            FROM initial_form_messages 
            WHERE chat_token = @chat_token");

        cmd.Parameters.AddWithValue("chat_token", chatToken);

        using var reader = await cmd.ExecuteReaderAsync();
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
        app.MapGet("/api/tickets", async (NpgsqlDataSource db) => // Mappar GET-begäran för att hämta ärenden
        {
            List<GetTicketsDTO> tickets = new();
            try
            {
                var cmd = db.CreateCommand("select chat_token, message, sender, submitted_at, issue_type, form_type from initial_form_messages"); // Skapar en SQL-fråga för att hämta ärenden

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
                        reader.GetString(5)
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
        string FormType);
}