using Microsoft.EntityFrameworkCore; // Importerar EntityFrameworkCore för att kunna använda databas
using server.Data; // Importerar server.Data för att få tillgång till AppDbContext
using server.Services; // Importerar server.Services för att få tillgång till EmailService
using server.Models; // Importerar server.Models för att få tillgång till datamodeller
using System.Text.Json; // Importerar System.Text.Json för JSON-serialisering

namespace server; // Deklarerar namnrymden för serverprojektet

public class Program // Deklarerar huvudklassen Program
{
    public static void Main(string[] args) // Deklarerar huvudmetoden Main
    {
        var builder = WebApplication.CreateBuilder(args); // Skapar en WebApplicationBuilder

        builder.Services.AddEndpointsApiExplorer(); // Lägger till API Explorer för Swagger
        builder.Services.AddSwaggerGen(); // Lägger till Swagger-generering
        builder.Services.AddAuthentication(); // Lägger till autentiseringsstöd
        builder.Services.AddAuthorization(); // Lägger till auktoriseringsstöd

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

        builder.Services.AddDbContext<AppDbContext>(options => // Konfigurerar databasanslutning
            options.UseNpgsql(
                builder.Configuration.GetConnectionString("DefaultConnection"))); // Använder PostgreSQL som databas

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
        app.MapPost("/api/users",
            async (UserForm user, AppDbContext db) => // Mappar POST-begäran för att skapa en användare
            {
                try
                {
                    user.CreatedAt = DateTime.UtcNow; // Sätter skapandetidpunkt till aktuell UTC-tid
                    db.Users.Add(user); // Lägger till användaren i databasen
                    await db.SaveChangesAsync(); // Sparar ändringar i databasen asynkront
                    return Results.Ok(new
                    {
                        message = "Användare skapad", user
                    }); // Returnerar ett OK-resultat med meddelande och användare
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new
                    {
                        message = "Kunde inte skapa användare", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });
        app.MapDelete("/api/users/{id}",
            async (int id, AppDbContext db) =>
            {
                try
                {
                    var user = await db.Users.FindAsync(id);
                    if (user == null)
                    {
                        return Results.NotFound(new { message = "Användaren hittades inte" });
                    }

                    db.Users.Remove(user);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "Användaren har tagits bort" });
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { message = "Kunde inte ta bort användaren", error = ex.Message });
                }
            });
        // PUT: Uppdatera en användare
        app.MapPut("/api/users/{id}", async (int id, UserForm updatedUser, AppDbContext db) =>
        {
            try
            {
                var user = await db.Users.FindAsync(id);
                if (user == null)
                {
                    return Results.NotFound(new { message = "Användaren hittades inte" });
                }

                // Uppdatera användarens egenskaper
                user.FirstName = updatedUser.FirstName;
                user.Password = updatedUser.Password;
                user.Company = updatedUser.Company;
                user.Role = updatedUser.Role;
                user.Company = updatedUser.Company;

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Användaren har uppdaterats", user });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte uppdatera användaren", error = ex.Message });
            }
        });


        app.MapGet("/api/users", async (AppDbContext db) => // Mappar GET-begäran för att hämta alla användare
        {
            var users = await db.Users.ToListAsync(); // Hämtar alla användare från databasen asynkront
            return Results.Ok(users); // Returnerar ett OK-resultat med användarna
        });

        app.MapGet("/api/users/{id}",
            async (int id, AppDbContext db) => // Mappar GET-begäran för att hämta en användare baserat på ID
            {
                var user = await db.Users.FindAsync(id); // Söker efter användaren med det angivna ID:et asynkront
                return
                    user is null
                        ? Results.NotFound()
                        : Results.Ok(user); // Returnerar NotFound om användaren inte hittas, annars OK med användaren
            });

        // Fordon Endpoints
        app.MapPost("/api/fordon",
            async (FordonForm submission, AppDbContext db, IEmailService emailService,
                IConfiguration config) => // Mappar POST-begäran för att skicka in fordonsformulär
            {
                using var transaction = await db.Database.BeginTransactionAsync(); // Startar en databastransaktion
                try
                {
                    submission.ChatToken = Guid.NewGuid().ToString(); // Genererar en unik chat-token
                    submission.SubmittedAt = DateTime.UtcNow; // Sätter inskickningstidpunkt till aktuell UTC-tid
                    submission.IsChatActive = true; // Sätter chat som aktiv

                    // Save form submission
                    db.FordonForms.Add(submission); // Lägger till fordonsformuläret i databasen

                    // Create initial chat message
                    var initialMessage = new ChatMessage // Skapar ett initialt chattmeddelande
                    {
                        ChatToken = submission.ChatToken, // Sätter chat-token
                        Sender = submission.FirstName, // Sätter avsändare till förnamnet från formuläret
                        Message = submission.Message, // Sätter meddelande från formuläret
                        Timestamp = submission.SubmittedAt // Sätter tidsstämpel till inskickningstidpunkten
                    };
                    db.ChatMessages.Add(initialMessage); // Lägger till det initiala chattmeddelandet i databasen

                    await db.SaveChangesAsync(); // Sparar ändringar i databasen asynkront

                    var baseUrl =
                        config["BaseUrl"] ??
                        "http://localhost:3001"; // Hämtar baswebbadressen från konfiguration eller använder standardvärde
                    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}"; // Skapar en länk till chatten

                    await emailService.SendChatInvitation( // Skickar en chattinbjudan via e-post
                        submission.Email, // E-postadress från formuläret
                        chatLink, // Chattlänk
                        submission.FirstName // Förnamn från formuläret
                    );

                    await transaction.CommitAsync(); // Genomför databasens transaktion
                    return Results.Ok(new
                    {
                        message = "Formulär skickat", submission
                    }); // Returnerar ett OK-resultat med meddelande och inlämnat formulär
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(); // Återställer databasens transaktion vid fel
                    return Results.BadRequest(new
                    {
                        message = "Ett fel uppstod", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        // Tele Endpoints
        app.MapPost("/api/tele",
            async (TeleForm submission, AppDbContext db, IEmailService emailService,
                IConfiguration config) => // Mappar POST-begäran för att skicka in teleformulär
            {
                using var transaction = await db.Database.BeginTransactionAsync(); // Startar en databastransaktion
                try
                {
                    submission.ChatToken = Guid.NewGuid().ToString(); // Genererar en unik chat-token
                    submission.SubmittedAt = DateTime.UtcNow; // Sätter inskickningstidpunkt till aktuell UTC-tid
                    submission.IsChatActive = true; // Sätter chat som aktiv

                    // Save form submission
                    db.TeleForms.Add(submission); // Lägger till teleformuläret i databasen

                    // Create initial chat message
                    var initialMessage = new ChatMessage // Skapar ett initialt chattmeddelande
                    {
                        ChatToken = submission.ChatToken, // Sätter chat-token
                        Sender = submission.FirstName, // Sätter avsändare till förnamnet från formuläret
                        Message = submission.Message, // Sätter meddelande från formuläret
                        Timestamp = submission.SubmittedAt // Sätter tidsstämpel till inskickningstidpunkten
                    };
                    db.ChatMessages.Add(initialMessage); // Lägger till det initiala chattmeddelandet i databasen

                    await db.SaveChangesAsync(); // Sparar ändringar i databasen asynkront

                    var baseUrl =
                        config["BaseUrl"] ??
                        "http://localhost:3001"; // Hämtar baswebbadressen från konfiguration eller använder standardvärde
                    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}"; // Skapar en länk till chatten

                    await emailService.SendChatInvitation( // Skickar en chattinbjudan via e-post
                        submission.Email, // E-postadress från formuläret
                        chatLink, // Chattlänk
                        submission.FirstName // Förnamn från formuläret
                    );

                    await transaction.CommitAsync(); // Genomför databasens transaktion
                    return Results.Ok(new
                    {
                        message = "Formulär skickat", submission
                    }); // Returnerar ett OK-resultat med meddelande och inlämnat formulär
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(); // Återställer databasens transaktion vid fel
                    return Results.BadRequest(new
                    {
                        message = "Ett fel uppstod", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        // Forsakring Endpoints
        app.MapPost("/api/forsakring",
            async (ForsakringsForm submission, AppDbContext db, IEmailService emailService,
                IConfiguration config) => // Mappar POST-begäran för att skicka in försäkringsformulär
            {
                using var transaction = await db.Database.BeginTransactionAsync(); // Startar en databastransaktion
                try
                {
                    submission.ChatToken = Guid.NewGuid().ToString(); // Genererar en unik chat-token
                    submission.SubmittedAt = DateTime.UtcNow; // Sätter inskickningstidpunkt till aktuell UTC-tid
                    submission.IsChatActive = true; // Sätter chat som aktiv

                    // Save form submission
                    db.ForsakringsForms.Add(submission); // Lägger till försäkringsformuläret i databasen

                    // Create initial chat message
                    var initialMessage = new ChatMessage // Skapar ett initialt chattmeddelande
                    {
                        ChatToken = submission.ChatToken, // Sätter chat-token
                        Sender = submission.FirstName, // Sätter avsändare till förnamnet från formuläret
                        Message = submission.Message, // Sätter meddelande från formuläret
                        Timestamp = submission.SubmittedAt // Sätter tidsstämpel till inskickningstidpunkten
                    };
                    db.ChatMessages.Add(initialMessage); // Lägger till det initiala chattmeddelandet i databasen

                    await db.SaveChangesAsync(); // Sparar ändringar i databasen asynkront

                    var baseUrl =
                        config["BaseUrl"] ??
                        "http://localhost:3001"; // Hämtar baswebbadressen från konfiguration eller använder standardvärde
                    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}"; // Skapar en länk till chatten

                    await emailService.SendChatInvitation( // Skickar en chattinbjudan via e-post
                        submission.Email, // E-postadress från formuläret
                        chatLink, // Chattlänk
                        submission.FirstName // Förnamn från formuläret
                    );

                    await transaction.CommitAsync(); // Genomför databasens transaktion
                    return Results.Ok(new
                    {
                        message = "Formulär skickat", submission
                    }); // Returnerar ett OK-resultat med meddelande och inlämnat formulär
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(); // Återställer databasens transaktion vid fel
                    return Results.BadRequest(new
                    {
                        message = "Ett fel uppstod", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        // Chat endpoints
        app.MapGet("/api/chat/{chatToken}",
            async (string chatToken,
                AppDbContext db) => // Mappar GET-begäran för att hämta chattinformation baserat på chat-token
            {
                if (string.IsNullOrEmpty(chatToken)) // Kontrollerar om chat-token är null eller tom
                {
                    return
                        Results.BadRequest(
                            "Ingen token angiven"); // Returnerar ett BadRequest-resultat om ingen token anges
                }

                try
                {
                    var initialMessage = await db
                        .InitialFormMessages // Hämtar det initiala formulärmeddelandet baserat på chat-token
                        .FirstOrDefaultAsync(m => m.ChatToken == chatToken);

                    if (initialMessage == null) // Kontrollerar om inget initialt meddelande hittas
                    {
                        return
                            Results.NotFound(
                                "Ingen chatt hittades med denna token"); // Returnerar ett NotFound-resultat om ingen chatt hittas
                    }

                    return Results.Ok(new
                    {
                        // Returnerar ett OK-resultat med chattinformation
                        firstName = initialMessage.Sender, // Förnamn från det initiala meddelandet
                        message = initialMessage.Message, // Meddelande från det initiala meddelandet
                        formType = initialMessage.FormType, // Formulärtyp från det initiala meddelandet
                        timestamp = initialMessage.Timestamp // Tidsstämpel från det initiala meddelandet
                    });
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new
                    {
                        message = "Ett fel uppstod", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        app.MapPost("/api/chat/message",
            async (ChatMessage message, AppDbContext db) => // Mappar POST-begäran för att skicka ett chattmeddelande
            {
                try
                {
                    message.Timestamp = DateTime.UtcNow; // Sätter tidsstämpel för meddelandet till aktuell UTC-tid
                    db.ChatMessages.Add(message); // Lägger till chattmeddelandet i databasen
                    await db.SaveChangesAsync(); // Sparar ändringar i databasen asynkront
                    return Results.Ok(new
                    {
                        message = "Meddelande skickat", chatMessage = message
                    }); // Returnerar ett OK-resultat med meddelande och skickat chattmeddelande
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new
                    {
                        message = "Kunde inte skicka meddelande", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        app.MapGet("/api/chat/messages/{chatToken}",
            async (string chatToken,
                AppDbContext db) => // Mappar GET-begäran för att hämta chattmeddelanden baserat på chat-token
            {
                try
                {
                    var messages = await db.ChatMessages // Hämtar chattmeddelanden baserat på chat-token
                        .Where(m => m.ChatToken == chatToken)
                        .OrderBy(m => m.Timestamp) // Sorterar meddelandena efter tidsstämpel
                        .ToListAsync(); // Konverterar till en lista asynkront

                    return Results.Ok(messages); // Returnerar ett OK-resultat med chattmeddelandena
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new
                    {
                        message = "Kunde inte hämta meddelanden", error = ex.Message
                    }); // Returnerar ett BadRequest-resultat vid fel
                }
            });

        // Tickets endpoint
        app.MapGet("/api/tickets", async (AppDbContext db) => // Mappar GET-begäran för att hämta ärenden
        {
            try
            {
                var tickets = await db.InitialFormMessages // Hämtar initiala formulärmeddelanden
                    .OrderByDescending(f => f.Timestamp) // Sorterar ärendena efter tidsstämpel i fallande ordning
                    .ToListAsync(); // Konverterar till en lista asynkront

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
}