namespace server.Services;

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

// Service-klass för att hantera e-postutskick i applikationen
public class EmailService : IEmailService
{
    // Privata fält för konfiguration och loggning
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    // Konstruktor som injicerar nödvändiga beroenden
    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    // Metod för att skicka chattinbjudningar via e-post
    public async Task SendChatInvitation(string recipientEmail, string chatLink, string firstName)
    {
        // Skapar ett nytt e-postmeddelande
        var message = new MimeMessage();
        // Sätter avsändare från konfigurationen
        message.From.Add(new MailboxAddress("Ditt Företag", _configuration["Email:From"]));
        // Lägger till mottagare med namn och e-postadress
        message.To.Add(new MailboxAddress(firstName, recipientEmail));
        // Sätter ämnesrad
        message.Subject = "Din chattlänk är redo!";

        // Skapar HTML-innehållet för e-postmeddelandet
        var builder = new BodyBuilder
        {
            HtmlBody = $@"
                <h2>Hej {firstName}!</h2>
                <p>Tack för ditt formulär. Du kan nu komma åt ditt chattrum genom att klicka på länken nedan:</p>
                <p><a href='{chatLink}'>Klicka här för att gå till chatten</a></p>
                <p>Länken är personlig och ska inte delas med andra.</p>
                <br/>
                <p>Med vänliga hälsningar,<br/>Ditt Företag</p>
            "
        };

        // Konverterar HTML-innehållet till meddelandeformat
        message.Body = builder.ToMessageBody();

        try
        {
            // Skapar en ny SMTP-klient för att skicka e-post
            using var client = new SmtpClient();
            
            // Hämtar och validerar portnumret från konfigurationen
            var port = _configuration["Email:Port"];
            if (string.IsNullOrEmpty(port))
            {
                throw new InvalidOperationException("Email port configuration is missing");
            }

            // Ansluter till SMTP-servern med säker anslutning (TLS)
            await client.ConnectAsync(
                _configuration["Email:SmtpServer"],
                int.Parse(port),
                SecureSocketOptions.StartTls);

            // Autentiserar mot SMTP-servern med användarnamn och lösenord
            await client.AuthenticateAsync(
                _configuration["Email:Username"],
                _configuration["Email:Password"]);

            // Skickar e-postmeddelandet
            await client.SendAsync(message);
            // Kopplar från SMTP-servern
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            // Loggar eventuella fel som uppstår vid e-postutskick
            _logger.LogError(ex, "Fel vid skickande av e-post till {Email}", recipientEmail);
            // Kastar om felet för hantering i anropande kod
            throw;
        }
    }
}