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


    app.MapGet("/api/forms", async (AppDbContext db) =>
    {
        var forms = await db.Forms.ToListAsync();
        return Results.Ok(forms);
    });


// User Endpoints
app.MapPost("/api/users", async (UserForm user, AppDbContext db) =>
{
   try 
   {
       user.CreatedAt = DateTime.UtcNow;
       
       db.Users.Add(user);
       await db.SaveChangesAsync();
       
       return Results.Ok(new { message = "User created successfully", user });
   }
   catch (Exception ex)
   {
       return Results.BadRequest(new { message = "Failed to create user", error = ex.Message });
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
app.MapGet("/api/fordon", async (AppDbContext db) =>
{
   var submissions = await db.FordonForms.ToListAsync();
   return Results.Ok(submissions);
});

app.MapGet("/api/fordon/{id}", async (int id, AppDbContext db) =>
{
   var submission = await db.FordonForms.FindAsync(id);
   return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/fordon", async (FordonForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
   submission.ChatToken = Guid.NewGuid().ToString();
   submission.SubmittedAt = DateTime.UtcNow;
   submission.IsChatActive = true;

   db.FordonForms.Add(submission);
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

// Tele Endpoints
app.MapGet("/api/tele", async (AppDbContext db) =>
{
   var submissions = await db.TeleForms.ToListAsync();
   return Results.Ok(submissions);
});

app.MapGet("/api/tele/{id}", async (int id, AppDbContext db) =>
{
   var submission = await db.TeleForms.FindAsync(id);
   return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/tele", async (TeleForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
   submission.ChatToken = Guid.NewGuid().ToString();
   submission.SubmittedAt = DateTime.UtcNow;
   submission.IsChatActive = true;

   db.TeleForms.Add(submission);
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

// Forsakring Endpoints
app.MapGet("/api/forsakring", async (AppDbContext db) =>
{
   var submissions = await db.ForsakringsForms.ToListAsync();
   return Results.Ok(submissions);
});

app.MapGet("/api/forsakring/{id}", async (int id, AppDbContext db) =>
{
   var submission = await db.ForsakringsForms.FindAsync(id);
   return submission is null ? Results.NotFound() : Results.Ok(submission);
});

app.MapPost("/api/forsakring", async (ForsakringsForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
   submission.ChatToken = Guid.NewGuid().ToString();
   submission.SubmittedAt = DateTime.UtcNow;
   submission.IsChatActive = true;

   db.ForsakringsForms.Add(submission);
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
   var fordonSubmission = await db.FordonForms
       .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
   if (fordonSubmission != null) return Results.Ok(fordonSubmission);

   var teleSubmission = await db.TeleForms
       .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
   if (teleSubmission != null) return Results.Ok(teleSubmission);

   var forsakringSubmission = await db.ForsakringsForms
       .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
   if (forsakringSubmission != null) return Results.Ok(forsakringSubmission);

   return Results.NotFound();
});

app.Run();