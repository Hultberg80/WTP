namespace server.Services;

using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;


public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendChatInvitation(string recipientEmail, string chatLink, string firstName)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Ditt Företag", _configuration["Email:From"]));
        message.To.Add(new MailboxAddress(firstName, recipientEmail));
        message.Subject = "Din chattlänk är redo!";

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

        message.Body = builder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            
            // Lägg till null-check här
            var port = _configuration["Email:Port"];
            if (string.IsNullOrEmpty(port))
            {
                throw new InvalidOperationException("Email port configuration is missing");
            }

            await client.ConnectAsync(
                _configuration["Email:SmtpServer"],
                int.Parse(port),
                SecureSocketOptions.StartTls);

            await client.AuthenticateAsync(
                _configuration["Email:Username"],
                _configuration["Email:Password"]);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fel vid skickande av e-post till {Email}", recipientEmail);
            throw;
        }
    }
    
    public async Task SendUserCredentials(string recipientEmail, string firstName, string password)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Ditt Företag", _configuration["Email:From"]));
        message.To.Add(new MailboxAddress(firstName, recipientEmail));
        message.Subject = "Dina inloggningsuppgifter";

        var builder = new BodyBuilder
        {
            HtmlBody = $@"
            <h2>Välkommen {firstName}!</h2>
            <p>Ditt konto har skapats. Här är dina inloggningsuppgifter:</p>
            <p><strong>Användarnamn:</strong> {recipientEmail}</p>
            <p><strong>Lösenord:</strong> {password}</p>
            <p>Vi rekommenderar att du ändrar ditt lösenord vid första inloggningen.</p>
            <br/>
            <p>Med vänliga hälsningar,<br/>Ditt Företag</p>
        "
        };

        message.Body = builder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
        
            var port = _configuration["Email:Port"];
            if (string.IsNullOrEmpty(port))
            {
                throw new InvalidOperationException("Email port configuration is missing");
            }

            await client.ConnectAsync(
                _configuration["Email:SmtpServer"],
                int.Parse(port),
                SecureSocketOptions.StartTls);

            await client.AuthenticateAsync(
                _configuration["Email:Username"],
                _configuration["Email:Password"]);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fel vid skickande av e-post till {Email}", recipientEmail);
            throw;
        }
    }

    
}

