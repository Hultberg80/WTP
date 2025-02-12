using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Services;
using server.Models;

var builder = WebApplication.CreateBuilder(args);

// Existing service configuration
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

// Minimal API Endpoints
app.MapGet("/api/formsubmissions", async (AppDbContext db) =>
{
    var submissions = await db.FormSubmissions.ToListAsync();
    return Results.Ok(submissions);
});

app.MapGet("/api/formsubmissions/{id}", async (int id, AppDbContext db) =>
{
    var submission = await db.FormSubmissions.FindAsync(id);
    return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/formsubmissions", async (FormSubmission submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
    // Sätt värden för nya submissions
    submission.ChatToken = Guid.NewGuid().ToString();
    submission.SubmittedAt = DateTime.UtcNow;
    submission.IsChatActive = true;

    // Spara till databasen
    db.FormSubmissions.Add(submission);
    await db.SaveChangesAsync();

    // Skapa chat-länk
    var baseUrl = config["BaseUrl"] ?? "http://localhost:3001";
    var chatLink = $"{baseUrl}/chat/{submission.ChatToken}";

    try
    {
        // Skicka e-post
        await emailService.SendChatInvitation(
            submission.Email,
            chatLink,
            submission.FirstName
        );
    }
    catch (Exception ex)
    {
        // Logga felet men returnera ändå success eftersom data är sparad
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

app.MapPut("/api/formsubmissions/{id}", async (int id, FormSubmission submission, AppDbContext db) =>
{
    var existingSubmission = await db.FormSubmissions.FindAsync(id);
    if (existingSubmission is null) return Results.NotFound();

    // Uppdatera fält
    existingSubmission.FirstName = submission.FirstName;
    existingSubmission.LastName = submission.LastName;
    existingSubmission.Email = submission.Email;
    existingSubmission.Gender = submission.Gender;
    existingSubmission.Subject = submission.Subject;
    existingSubmission.About = submission.About;
    existingSubmission.IsChatActive = submission.IsChatActive;

    await db.SaveChangesAsync();
    return Results.Ok(existingSubmission);
});

app.MapDelete("/api/formsubmissions/{id}", async (int id, AppDbContext db) =>
{
    var submission = await db.FormSubmissions.FindAsync(id);
    if (submission is null) return Results.NotFound();

    db.FormSubmissions.Remove(submission);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.Run();