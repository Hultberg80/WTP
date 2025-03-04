using System.Text.Json;
using server.Models;


namespace server.Extensions;

public static class EndpointExtensions
{
    public static RouteHandlerBuilder RequireRole(this RouteHandlerBuilder routeHandlerBuilder, string[] roles)
    {
        return builder.AddEndpointFilter(async (context, next) =>

            var httpContext = context.HttpContext;
            var userJson = httpContext.Session.GetString("user");

        if (userJson == null)
        {
            return Results.Unauthorized();
        }

        var user = JsonSerializer.Deserialize<User>(userJson);
        if (user.RoleId != role)
        {
            return Results.StatusCode(403);
        }

        return await next(context);
    });
}
}