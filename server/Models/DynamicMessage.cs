namespace server.Models;

public class DynamicMessage
{
    public string ChatToken { get; set; } = string.Empty;
    public string Sender { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string IssueType { get; set; } = string.Empty;
    public string CompanyType { get; set; } = string.Empty;
}