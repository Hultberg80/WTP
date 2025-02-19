using System.Text.Json;
using Microsoft.Extensions.Configuration;
using server.Models;

namespace server.Services;

public class FormConfigService : IFormConfigService
{
    private readonly IConfiguration _configuration;
    private readonly Dictionary<string, FormConfig> _formConfigs;

    public FormConfigService(IConfiguration configuration)
    {
        _configuration = configuration;
        
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        try
        {
            // Potential paths to check
            var possiblePaths = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Configs", "formConfigs.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "Configs", "formConfigs.json"),
                Path.Combine(Environment.CurrentDirectory, "Configs", "formConfigs.json"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Configs", "formConfigs.json")
            };

            string configPath = null;

            // Find the first existing path
            foreach (var path in possiblePaths)
            {
                Console.WriteLine($"Checking path: {path}");
                if (File.Exists(path))
                {
                    configPath = path;
                    break;
                }
            }

            if (configPath == null)
            {
                Console.WriteLine("No config file found in any of the checked locations!");
                _formConfigs = new Dictionary<string, FormConfig>();
                return;
            }

            Console.WriteLine($"Using config file at: {configPath}");

            // Read the JSON content
            var configJson = File.ReadAllText(configPath);
            Console.WriteLine("Raw JSON content:");
            Console.WriteLine(configJson);

            // Deserialize the JSON
            var configs = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, FormConfig>>>(configJson, options);
            
            // Extract the forms
            _formConfigs = configs?["forms"] ?? new Dictionary<string, FormConfig>();

            // Log loaded configurations
            Console.WriteLine("Loaded form configs:");
            foreach (var config in _formConfigs)
            {
                Console.WriteLine($"Form Type: {config.Key}, Name: {config.Value.Name}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error reading form configurations:");
            Console.WriteLine(ex.ToString());
            _formConfigs = new Dictionary<string, FormConfig>();
            throw;
        }
    }

    public Task<FormConfig?> GetFormConfig(string formType)
    {
        // Ensure case-insensitive lookup
        return Task.FromResult(
            _formConfigs.GetValueOrDefault(formType.ToLower())
        );
    }

    public bool ValidateFormData(string formType, Dictionary<string, string> fields)
    {
        // Get the form configuration
        var config = _formConfigs.GetValueOrDefault(formType.ToLower());
        
        // If no configuration found, validation fails
        if (config == null) return false;

        // Check all required fields
        return config.Fields
            .Where(f => f.Required)
            .All(f => 
                fields.ContainsKey(f.Key) && 
                !string.IsNullOrWhiteSpace(fields[f.Key])
            );
    }

    public IEnumerable<string> GetAvailableFormTypes()
    {
        return _formConfigs.Keys;
    }
}