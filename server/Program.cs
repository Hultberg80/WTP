using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Services;
using server.Models;

var builder = WebApplication.CreateBuilder(args);

// Service configuration
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

// Auto Service Endpoints
app.MapGet("/api/auto-service", async (AppDbContext db) =>
{
    var submissions = await db.AutoServiceSubmissions.ToListAsync();
    return Results.Ok(submissions);
});

app.MapGet("/api/auto-service/{id}", async (int id, AppDbContext db) =>
{
    var submission = await db.AutoServiceSubmissions.FindAsync(id);
    return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/auto-service", async (AutoServiceSubmission submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
    submission.ChatToken = Guid.NewGuid().ToString();
    submission.SubmittedAt = DateTime.UtcNow;
    submission.IsChatActive = true;

    db.AutoServiceSubmissions.Add(submission);
    await db.SaveChangesAsync();

    var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

    try
    {
        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );
    }
    catch (Exception ex)
    {
        return Results.Ok(new
        {
            message = "Form submitted successfully but email delivery failed",
            submission
        });
    }

    return Results.Ok(new
    {
        message = "Form submitted successfully",
        submission
    });
});

// Telecom Endpoints
app.MapGet("/api/telecom", async (AppDbContext db) =>
{
    var submissions = await db.TelecomSubmissions.ToListAsync();
    return Results.Ok(submissions);
});

app.MapGet("/api/telecom/{id}", async (int id, AppDbContext db) =>
{
    var submission = await db.TelecomSubmissions.FindAsync(id);
    return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/telecom", async (TelecomSubmission submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
    submission.ChatToken = Guid.NewGuid().ToString();
    submission.SubmittedAt = DateTime.UtcNow;
    submission.IsChatActive = true;

    db.TelecomSubmissions.Add(submission);
    await db.SaveChangesAsync();

    var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

    try
    {
        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );
    }
    catch (Exception ex)
    {
        return Results.Ok(new
        {
            message = "Form submitted successfully but email delivery failed",
            submission
        });
    }

    return Results.Ok(new
    {
        message = "Form submitted successfully",
        submission
    });
});

// Insurance Endpoints
app.MapGet("/api/insurance", async (AppDbContext db) =>
{
    var submissions = await db.InsuranceSubmissions.ToListAsync();
    return Results.Ok(submissions);
});

app.MapGet("/api/insurance/{id}", async (int id, AppDbContext db) =>
{
    var submission = await db.InsuranceSubmissions.FindAsync(id);
    return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/insurance", async (InsuranceSubmission submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
    submission.ChatToken = Guid.NewGuid().ToString();
    submission.SubmittedAt = DateTime.UtcNow;
    submission.IsChatActive = true;

    db.InsuranceSubmissions.Add(submission);
    await db.SaveChangesAsync();

    var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

    try
    {
        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );
    }
    catch (Exception ex)
    {
        return Results.Ok(new
        {
            message = "Form submitted successfully but email delivery failed",
            submission
        });
    }

    return Results.Ok(new
    {
        message = "Form submitted successfully",
        submission
    });
});

// Common endpoint för att kolla chat token
app.MapGet("/api/chat/{chatToken}", async (string chatToken, AppDbContext db) =>
{
    // Kolla i alla tabeller efter chatToken
    var autoService = await db.AutoServiceSubmissions
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (autoService != null) return Results.Ok(autoService);

    var telecom = await db.TelecomSubmissions
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (telecom != null) return Results.Ok(telecom);

    var insurance = await db.InsuranceSubmissions
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (insurance != null) return Results.Ok(insurance);

    return Results.NotFound();
});

app.Run();