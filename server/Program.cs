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

        // Chat endpoints - FÖRBÄTTRADE ENDPOINTS MED BÄTTRE FELHANTERING
        app.MapGet("/api/chat/{chatToken}", async (string chatToken, AppDbContext db) => 
        {
            if (string.IsNullOrEmpty(chatToken))
            {
                return Results.BadRequest("Ingen token angiven");
            }

            try
            {
                // First check the view
                var initialMessage = await db.InitialFormMessages
                    .FirstOrDefaultAsync(m => m.ChatToken == chatToken);

                // If not found, check each form type directly as a fallback
                if (initialMessage == null)
                {
                    // Check FordonForms
                    var fordonForm = await db.FordonForms
                        .FirstOrDefaultAsync(f => f.ChatToken == chatToken);
                    
                    if (fordonForm != null)
                    {
                        return Results.Ok(new
                        {
                            firstName = fordonForm.FirstName,
                            message = fordonForm.Message,
                            formType = "Fordonsservice",
                            timestamp = fordonForm.SubmittedAt
                        });
                    }

                    // Check TeleForms
                    var teleForm = await db.TeleForms
                        .FirstOrDefaultAsync(f => f.ChatToken == chatToken);
                    
                    if (teleForm != null)
                    {
                        return Results.Ok(new
                        {
                            firstName = teleForm.FirstName,
                            message = teleForm.Message,
                            formType = "Tele/Bredband",
                            timestamp = teleForm.SubmittedAt
                        });
                    }

                    // Check ForsakringsForms
                    var forsakringsForm = await db.ForsakringsForms
                        .FirstOrDefaultAsync(f => f.ChatToken == chatToken);
                    
                    if (forsakringsForm != null)
                    {
                        return Results.Ok(new
                        {
                            firstName = forsakringsForm.FirstName,
                            message = forsakringsForm.Message,
                            formType = "Försäkringsärenden",
                            timestamp = forsakringsForm.SubmittedAt
                        });
                    }

                    // If still not found, return NotFound
                    return Results.NotFound("Ingen chatt hittades med denna token");
                }

                return Results.Ok(new
                {
                    firstName = initialMessage.Sender,
                    message = initialMessage.Message,
                    formType = initialMessage.FormType,
                    timestamp = initialMessage.Timestamp
                });
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                Console.WriteLine($"Error in /api/chat/{{chatToken}}: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                
                return Results.Problem(
                    title: "Ett fel uppstod vid hämtning av chat", 
                    detail: ex.Message,
                    statusCode: 500
                );
            }
        });

        app.MapGet("/api/chat/messages/{chatToken}", async (string chatToken, AppDbContext db) => 
        {
            if (string.IsNullOrEmpty(chatToken))
            {
                return Results.BadRequest("Ingen token angiven");
            }

            try
            {
                var messages = await db.ChatMessages
                    .Where(m => m.ChatToken == chatToken)
                    .OrderBy(m => m.Timestamp)
                    .ToListAsync();

                // Check if this chat actually exists
                if (!messages.Any())
                {
                    // Check if chat exists in any form
                    bool chatExists = await db.FordonForms.AnyAsync(f => f.ChatToken == chatToken) || 
                                    await db.TeleForms.AnyAsync(f => f.ChatToken == chatToken) ||
                                    await db.ForsakringsForms.AnyAsync(f => f.ChatToken == chatToken);

                    if (!chatExists)
                    {
                        return Results.NotFound("Ingen chatt hittades med denna token");
                    }
                }

                return Results.Ok(messages);
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                Console.WriteLine($"Error in /api/chat/messages/{{chatToken}}: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                
                return Results.Problem(
                    title: "Ett fel uppstod vid hämtning av meddelanden", 
                    detail: ex.Message,
                    statusCode: 500
                );
            }
        });

        app.MapPost("/api/chat/message", async (ChatMessage message, AppDbContext db) => 
        {
            if (string.IsNullOrEmpty(message.ChatToken) || string.IsNullOrEmpty(message.Message))
            {
                return Results.BadRequest("ChatToken och Message är obligatoriska fält");
            }

            try
            {
                // Verify chat exists before adding message
                bool chatExists = await db.FordonForms.AnyAsync(f => f.ChatToken == message.ChatToken) || 
                                await db.TeleForms.AnyAsync(f => f.ChatToken == message.ChatToken) ||
                                await db.ForsakringsForms.AnyAsync(f => f.ChatToken == message.ChatToken);

                if (!chatExists)
                {
                    return Results.NotFound("Ingen chatt hittades med denna token");
                }

                message.Timestamp = DateTime.UtcNow;
                db.ChatMessages.Add(message);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Meddelande skickat", chatMessage = message });
            }
            catch (Exception ex)
            {
                // Log the exception for debugging
                Console.WriteLine($"Error in POST /api/chat/message: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                
                return Results.Problem(
                    title: "Kunde inte skicka meddelande", 
                    detail: ex.Message,
                    statusCode: 500
                );
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
                // Log the exception for debugging
                Console.WriteLine($"Error in /api/tickets: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                
                // Try a fallback approach if the view fails
                try {
                    // Get data directly from individual tables
                    var fordonForms = await db.FordonForms
                        .Where(f => f.IsChatActive)
                        .Select(f => new {
                            ChatToken = f.ChatToken,
                            Sender = f.FirstName,
                            Message = f.Message,
                            Timestamp = f.SubmittedAt,
                            IssueType = f.IssueType,
                            Email = f.Email,
                            FormType = "Fordonsservice"
                        })
                        .ToListAsync();
                        
                    var teleForms = await db.TeleForms
                        .Where(f => f.IsChatActive)
                        .Select(f => new {
                            ChatToken = f.ChatToken,
                            Sender = f.FirstName,
                            Message = f.Message,
                            Timestamp = f.SubmittedAt,
                            IssueType = f.IssueType,
                            Email = f.Email,
                            FormType = "Tele/Bredband"
                        })
                        .ToListAsync();
                        
                    var forsakringsForms = await db.ForsakringsForms
                        .Where(f => f.IsChatActive)
                        .Select(f => new {
                            ChatToken = f.ChatToken,
                            Sender = f.FirstName,
                            Message = f.Message,
                            Timestamp = f.SubmittedAt,
                            IssueType = f.IssueType,
                            Email = f.Email,
                            FormType = "Försäkringsärenden"
                        })
                        .ToListAsync();
                        
                    // Combine and order results
                    var allTickets = fordonForms.Concat(teleForms).Concat(forsakringsForms)
                        .OrderByDescending(t => t.Timestamp)
                        .ToList();
                        
                    return Results.Ok(allTickets);
                }
                catch (Exception fallbackEx) {
                    Console.WriteLine($"Fallback also failed: {fallbackEx.Message}");
                    return Results.Problem(
                        title: "Kunde inte hämta ärenden", 
                        detail: ex.Message,
                        statusCode: 500
                    );
                }
            }
        });

        app.Run(); // Startar webbservern
    }
}