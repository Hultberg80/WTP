namespace server.Records;


public record LoginRequest
(
    string Email,
    string Password
);