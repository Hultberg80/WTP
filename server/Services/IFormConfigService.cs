using server.Models;

namespace server.Services;

public interface IFormConfigService
{
    Task<FormConfig?> GetFormConfig(string formType);
    bool ValidateFormData(string formType, Dictionary<string, string> fields);
    IEnumerable<string> GetAvailableFormTypes();
}