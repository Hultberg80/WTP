using Microsoft.EntityFrameworkCore; // Importerar EntityFrameworkCore för att kunna använda databas
using server.Data; // Importerar server.Data för att få tillgång till AppDbContext
using server.Services; // Importerar server.Services för att få tillgång till EmailService
using server.Models; // Importerar server.Models för att få tillgång till datamodeller
using Microsoft.AspNetCore.Mvc; // Importerar Microsoft.AspNetCore.Mvc för att använda MVC-funktioner
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
        

// Ersätt dina nuvarande chat endpoints med denna korrigerade version
app.MapGet("/api/chat/{chatToken}", async (string chatToken, [FromQuery] bool metadata, [FromQuery] string since, HttpContext context, AppDbContext db) => 
{
    Console.WriteLine($"Chat request: token={chatToken}, metadata={metadata}, since={since ?? "null"}");
    
    if (string.IsNullOrEmpty(chatToken))
    {
        return Results.BadRequest("Ingen token angiven");
    }

    try
    {
        // Kontrollera att chatten existerar först
        bool chatExists = await db.InitialFormMessages.AnyAsync(m => m.ChatToken == chatToken);
        
        if (!chatExists)
        {
            Console.WriteLine($"Chat not found: {chatToken}");
            return Results.NotFound("Ingen chatt hittades med denna token");
        }
        
        // MODE 1: Metadata-mode - returnera endast grundläggande information
        if (metadata)
        {
            Console.WriteLine("Metadata request: Fetching chat info");
            
            var initialMessage = await db.InitialFormMessages
                .FirstOrDefaultAsync(m => m.ChatToken == chatToken);
                
            if (initialMessage == null)
            {
                return Results.NotFound("Ingen chatt hittades med denna token");
            }
            
            Console.WriteLine("Returning metadata response");
            return Results.Ok(new
            {
                firstName = initialMessage.Sender,
                message = initialMessage.Message,
                formType = initialMessage.FormType,
                timestamp = initialMessage.Timestamp
            });
        }
        
        // MODE 2: Messages-mode - hämta meddelanden
        
        // Kontrollera om detta är en long polling request
        bool isLongPolling = context.Request.Headers.TryGetValue("X-Long-Polling", out var longPollingValue) && 
                            longPollingValue == "true";
                            
        Console.WriteLine($"Message request type: {(isLongPolling ? "Long polling" : "Initial request")}");
        
        // Parsa since-parametern om den finns
        DateTime sinceTime = DateTime.MinValue;
        if (!string.IsNullOrEmpty(since))
        {
            if (!DateTime.TryParse(since, out sinceTime))
            {
                Console.WriteLine($"Failed to parse date: {since}, using MinValue");
                sinceTime = DateTime.MinValue;
            }
        }
        
        // Förbered resultatlistan
        var result = new List<object>();
        
        // För initial request (inte long polling), hämta alltid initialmeddelandet
        if (!isLongPolling)
        {
            var initialMessage = await db.InitialFormMessages
                .FirstOrDefaultAsync(m => m.ChatToken == chatToken);
                
            if (initialMessage != null)
            {
                result.Add(new
                {
                    chatToken = initialMessage.ChatToken,
                    sender = initialMessage.Sender,
                    message = initialMessage.Message,
                    timestamp = initialMessage.Timestamp,
                    isInitial = true
                });
                Console.WriteLine("Added initial message to result");
            }
        }
        
        // Hämta chattmeddelanden efter since-tidpunkten
        var chatMessages = await db.ChatMessages
            .Where(m => m.ChatToken == chatToken && m.Timestamp > sinceTime)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();
            
        Console.WriteLine($"Found {chatMessages.Count} chat messages");
        
        // Lägg till chattmeddelandena i resultatet
        foreach (var msg in chatMessages)
        {
            result.Add(new
            {
                chatToken = msg.ChatToken,
                sender = msg.Sender,
                message = msg.Message,
                timestamp = msg.Timestamp,
                isInitial = false
            });
        }
        
        // För vanliga requests eller när vi redan har meddelanden, returnera omedelbart
        if (!isLongPolling || result.Count > 0)
        {
            Console.WriteLine($"Returning {result.Count} messages immediately");
            return Results.Ok(result);
        }
        
        // LONG POLLING - vänta på nya meddelanden
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        
        int pollCount = 0;
        const int MaxPolls = 10;
        
        while (!cts.Token.IsCancellationRequested && pollCount < MaxPolls)
        {
            // Kontrollera om klienten kopplat ner
            if (context.RequestAborted.IsCancellationRequested)
            {
                Console.WriteLine("Client disconnected");
                return Results.NoContent();
            }
            
            // Vänta innan nästa kontroll
            await Task.Delay(2000, cts.Token);
            pollCount++;
            
            // Kontrollera efter nya meddelanden
            var newMessages = await db.ChatMessages
                .Where(m => m.ChatToken == chatToken && m.Timestamp > sinceTime)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();
                
            if (newMessages.Count > 0)
            {
                var newResult = newMessages.Select(msg => new
                {
                    chatToken = msg.ChatToken,
                    sender = msg.Sender,
                    message = msg.Message,
                    timestamp = msg.Timestamp,
                    isInitial = false
                }).ToList();
                
                Console.WriteLine($"Long polling: Found {newResult.Count} messages after polling");
                return Results.Ok(newResult);
            }
        }
        
        // Inga nya meddelanden efter timeout
        Console.WriteLine("Long polling: No new messages after timeout");
        return Results.Ok(new List<object>());
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR in chat endpoint: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        
        return Results.BadRequest(new 
        { 
            message = "Ett fel uppstod", 
            error = ex.Message 
        });
    }
});


        
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
