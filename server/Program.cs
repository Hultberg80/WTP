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
        builder.Services.AddScoped<IFormConfigService, FormConfigService>();

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

        // Dynamic Form Endpoint
        app.MapPost("/api/forms", async (DynamicForm submission, AppDbContext db, 
            IEmailService emailService, IFormConfigService formConfigService, IConfiguration config) =>
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                var formConfig = await formConfigService.GetFormConfig(submission.FormType);
                if (formConfig == null)
                {
                    return Results.BadRequest(new { message = "Ogiltig formulärtyp" });
                }

                if (!formConfigService.ValidateFormData(submission.FormType, submission.Fields))
                {
                    return Results.BadRequest(new { message = "Alla obligatoriska fält är inte ifyllda" });
                }

                submission.ChatToken = Guid.NewGuid().ToString();
                submission.SubmittedAt = DateTime.UtcNow;
                submission.IsChatActive = true;

                // Spara formuläret
                db.DynamicForms.Add(submission);
        
                // Skapa chattmeddelande
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

        // Form Configuration Endpoint
        app.MapGet("/api/forms/config/{formType}", async (string formType, IFormConfigService formConfigService) =>
        {
            var config = await formConfigService.GetFormConfig(formType);
            return config == null ? Results.NotFound() : Results.Ok(config);
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
                var initialMessage = await db.DynamicMessages
                    .FirstOrDefaultAsync(m => m.ChatToken == chatToken);

                if (initialMessage == null)
                {
                    return Results.NotFound("Ingen chatt hittades med denna token");
                }

                return Results.Ok(new {
                    firstName = initialMessage.Sender,
                    message = initialMessage.Message,
                    issueType = initialMessage.IssueType,
                    companyType = initialMessage.CompanyType,
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
                var tickets = await db.DynamicMessages
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