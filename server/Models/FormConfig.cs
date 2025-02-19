namespace server.Models;


public class FormConfig
{
    public string Name { get; set; } = string.Empty;
    public List<FormField> Fields { get; set; } = new();
}