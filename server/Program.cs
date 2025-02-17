using Microsoft.EntityFrameworkCore;
using server.Services;
using server.Models;

var builder = WebApplication.CreateBuilder(args);

// Konfigurerar grundläggande services för API:et
builder.Services.AddEndpointsApiExplorer();  // Lägger till API-utforskare
builder.Services.AddSwaggerGen();            // Lägger till Swagger dokumentation
builder.Services.AddAuthentication();         // Konfigurerar autentisering
builder.Services.AddAuthorization();         // Konfigurerar auktorisering

// Konfigurerar CORS-policy för att tillåta React-appen att kommunicera med API:et
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
                .AllowAnyMethod()  // Tillåter alla HTTP-metoder (GET, POST, etc.)
                .AllowAnyHeader(); // Tillåter alla HTTP-headers
        });
});

// Konfigurerar databaskontext för PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Registrerar EmailService för dependency injection
builder.Services.AddScoped<IEmailService, EmailService>();

// Bygger applikationen
var app = builder.Build();

// Konfigurerar Swagger endast i utvecklingsmiljö
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Konfigurerar middleware pipeline
app.UseHttpsRedirection();    // Omdirigerar HTTP till HTTPS
app.UseCors("AllowReactApp"); // Aktiverar CORS
app.UseAuthentication();       // Aktiverar autentisering
app.UseAuthorization();        // Aktiverar auktorisering

// === User Endpoints ===
// POST: Skapar ny användare
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

// GET: Hämtar alla användare
app.MapGet("/api/users", async (AppDbContext db) =>
{
   var users = await db.Users.ToListAsync();
   return Results.Ok(users);
});

// GET: Hämtar specifik användare med ID
app.MapGet("/api/users/{id}", async (int id, AppDbContext db) =>
{
   var user = await db.Users.FindAsync(id);
   return user is null ? Results.NotFound() : Results.Ok(user);
});

// === Fordon Endpoints ===
// GET: Hämtar alla fordonsformulär
app.MapGet("/api/fordon", async (AppDbContext db) =>
{
   var submissions = await db.FordonForms.ToListAsync();
   return Results.Ok(submissions);
});

// GET: Hämtar specifikt fordonsformulär med ID
app.MapGet("/api/fordon/{id}", async (int id, AppDbContext db) =>
{
   var submission = await db.FordonForms.FindAsync(id);
   return submission is null ? Results.NotFound() : Results.Ok(submission);
});

// POST: Skapar nytt fordonsformulär och skickar e-post
app.MapPost("/api/fordon", async (FordonForm submission, AppDbContext db, IEmailService emailService, IConfiguration config) =>
{
   // Sätter grundläggande formulärdata
   submission.ChatToken = Guid.NewGuid().ToString();
   submission.SubmittedAt = DateTime.UtcNow;
   submission.IsChatActive = true;

   // Sparar formuläret i databasen
   db.FordonForms.Add(submission);
   await db.SaveChangesAsync();

   // Skapar och skickar chattlänk via e-post
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

// === Common Chat Token Endpoint ===
// GET: Söker efter chatttoken i alla formulärtyper
app.MapGet("/api/chat/{chatToken}", async (string chatToken, AppDbContext db) =>
{
    // Söker efter token i fordonsformulär
    var fordonSubmission = await db.FordonForms
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (fordonSubmission != null) return Results.Ok(fordonSubmission);

    // Söker efter token i teleformulär
    var teleSubmission = await db.TeleForms
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (teleSubmission != null) return Results.Ok(teleSubmission);

    // Söker efter token i försäkringsformulär
    var forsakringSubmission = await db.ForsakringsForms
        .FirstOrDefaultAsync(s => s.ChatToken == chatToken);
    if (forsakringSubmission != null) return Results.Ok(forsakringSubmission);

    // Returnerar 404 om ingen token hittas
    return Results.NotFound();
});

// Startar applikationen
app.Run();