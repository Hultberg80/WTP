
namespace server.Records;

public record LoginRequest(){
    public string Firstname { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
};