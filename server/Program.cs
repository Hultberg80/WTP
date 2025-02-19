using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Services;
using server.Models;
using System.Text.Json;

namespace server;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowReactApp",
                builder =>
                {
                    builder
                        .WithOrigins(
                            "http://localhost:3001",
                            "https://localhost:3001"
                        )
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
        });

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        builder.Services.AddScoped<IEmailService, EmailService>();

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();
        app.UseCors("AllowReactApp");
        app.UseAuthentication();
        app.UseAuthorization();

        // User Endpoints
        app.MapPost("/api/users", async (UserForm user, AppDbContext db) =>
        {
            try 
            {
                user.CreatedAt = DateTime.UtcNow;
                db.Users.Add(user);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Användare skapad", user });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte skapa användare", error = ex.Message });
            }
        });

        app.MapGet("/api/users", async (AppDbContext db) =>
        {
            var users = await db.Users.ToListAsync();
            return Results.Ok(users);
        });

        app.MapGet("/api/users/{id}", async (int id, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            return user is null ? Results.NotFound() : Results.Ok(user);
        });

        // Fordon Endpoints
        app.MapPost("/api/fordon", async (FordonForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                submission.ChatToken = Guid.NewGuid().ToString();
                submission.SubmittedAt = DateTime.UtcNow;
                submission.IsChatActive = true;

                // Save form submission
                db.FordonForms.Add(submission);
                
                // Create initial chat message
                var initialMessage = new ChatMessage
                {
                    ChatToken = submission.ChatToken,
                    Sender = submission.FirstName,
                    Message = submission.Message,
                    Timestamp = submission.SubmittedAt
                };
                db.ChatMessages.Add(initialMessage);
                
                await db.SaveChangesAsync();

                var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
                var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

                await emailService.SendChatInvitation(
                    submission.Email,
                    chatLink,
                    submission.FirstName
                );

                await transaction.CommitAsync();
                return Results.Ok(new { message = "Formulär skickat", submission });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
            }
        });

        // Tele Endpoints
        app.MapPost("/api/tele", async (TeleForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                submission.ChatToken = Guid.NewGuid().ToString();
                submission.SubmittedAt = DateTime.UtcNow;
                submission.IsChatActive = true;

                // Save form submission
                db.TeleForms.Add(submission);
                
                // Create initial chat message
                var initialMessage = new ChatMessage
                {
                    ChatToken = submission.ChatToken,
                    Sender = submission.FirstName,
                    Message = submission.Message,
                    Timestamp = submission.SubmittedAt
                };
                db.ChatMessages.Add(initialMessage);
                
                await db.SaveChangesAsync();

                var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
                var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

                await emailService.SendChatInvitation(
                    submission.Email,
                    chatLink,
                    submission.FirstName
                );

                await transaction.CommitAsync();
                return Results.Ok(new { message = "Formulär skickat", submission });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
            }
        });

        // Forsakring Endpoints
        app.MapPost("/api/forsakring", async (ForsakringsForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                submission.ChatToken = Guid.NewGuid().ToString();
                submission.SubmittedAt = DateTime.UtcNow;
                submission.IsChatActive = true;

                // Save form submission
                db.ForsakringsForms.Add(submission);
                
                // Create initial chat message
                var initialMessage = new ChatMessage
                {
                    ChatToken = submission.ChatToken,
                    Sender = submission.FirstName,
                    Message = submission.Message,
                    Timestamp = submission.SubmittedAt
                };
                db.ChatMessages.Add(initialMessage);
                
                await db.SaveChangesAsync();

                var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
                var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

                await emailService.SendChatInvitation(
                    submission.Email,
                    chatLink,
                    submission.FirstName
                );

                await transaction.CommitAsync();
                return Results.Ok(new { message = "Formulär skickat", submission });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
            }
        });

        // Chat endpoints
        app.MapGet("/api/chat/{chatToken}", async (string chatToken, AppDbContext db) =>
        {
            if (string.IsNullOrEmpty(chatToken))
            {
                return Results.BadRequest("Ingen token angiven");
            }

            try
            {
                var initialMessage = await db.InitialFormMessages
                    .FirstOrDefaultAsync(m => m.ChatToken == chatToken);

                if (initialMessage == null)
                {
                    return Results.NotFound("Ingen chatt hittades med denna token");
                }

                return Results.Ok(new {
                    firstName = initialMessage.Sender,
                    message = initialMessage.Message,
                    formType = initialMessage.FormType,
                    timestamp = initialMessage.Timestamp
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Ett fel uppstod", error = ex.Message });
            }
        });

        app.MapPost("/api/chat/message", async (ChatMessage message, AppDbContext db) =>
        {
            try 
            {
                message.Timestamp = DateTime.UtcNow;
                db.ChatMessages.Add(message);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Meddelande skickat", chatMessage = message });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte skicka meddelande", error = ex.Message });
            }
        });

        app.MapGet("/api/chat/messages/{chatToken}", async (string chatToken, AppDbContext db) =>
        {
            try 
            {
                var messages = await db.ChatMessages
                    .Where(m => m.ChatToken == chatToken)
                    .OrderBy(m => m.Timestamp)
                    .ToListAsync();

                return Results.Ok(messages);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte hämta meddelanden", error = ex.Message });
            }
        });

        // Tickets endpoint
        app.MapGet("/api/tickets", async (AppDbContext db) =>
        {
            try 
            {
                var tickets = await db.InitialFormMessages
                    .OrderByDescending(f => f.Timestamp)
                    .ToListAsync();

                return Results.Ok(tickets);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = "Kunde inte hämta ärenden", error = ex.Message });
            }
        });

        app.Run();
    }
}