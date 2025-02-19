namespace server.Models;

public class InitialFormMessage
{
    public string Sender { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string FormType { get; set; } = string.Empty;
    public string ChatToken { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    
}