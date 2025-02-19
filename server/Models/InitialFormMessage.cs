namespace server.Models;

public class InitialFormMessage
{
    public string ChatToken { get; set; }
    public string Sender { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; }
    public string FormType { get; set; }
}