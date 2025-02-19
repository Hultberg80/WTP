import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; 

function DynamiskForm() {
  const [formConfig, setFormConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState({ text: '', isError: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formType } = useParams(); 

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const response = await fetch(`/api/forms/config/${formType}`);
        if (response.ok) {
          const config = await response.json();
          setFormConfig(config);
        } else {
          setMessage({ text: 'Kunde inte hämta formulärkonfiguration', isError: true });
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage({
          text: 'Ett fel uppstod vid hämtning av formulärkonfiguration',
          isError: true
        });
      }
    };

    fetchFormConfig();
  }, [formType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType,
          ...formData
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({
          text: result.message,
          isError: false
        });
        setFormData({});
      } else {
        const error = await response.json();
        setMessage({
          text: error.message || 'Ett fel uppstod vid skickandet av formuläret',
          isError: true
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({
        text: 'Ett fel uppstod. Vänligen försök igen eller kontakta oss via telefon.',
        isError: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!formConfig) {
    return <div>Laddar formulär...</div>;
  }

  return (
    <div className="container">
      <h1>{formConfig.name}</h1>
      <form onSubmit={handleSubmit}>
        {formConfig.fields.map(field => (
          <div key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            {field.type === 'text' && (
              <input
                type="text"
                id={field.key}
                name={field.key}
                value={formData[field.key] || ''}
                onChange={handleInputChange}
                required={field.required}
                disabled={isSubmitting}
              />
            )}
            {field.type === 'textarea' && (
              <textarea
                id={field.key}
                name={field.key}
                value={formData[field.key] || ''}
                onChange={handleInputChange}
                required={field.required}
                disabled={isSubmitting}
                placeholder={`Ange din ${field.label.toLowerCase()}`}
              />
            )}
            {field.type === 'select' && (
              <select
                id={field.key}
                name={field.key}
                value={formData[field.key] || ''}
                onChange={handleInputChange}
                required={field.required}
                disabled={isSubmitting}
              >
                <option value="">{`Välj ${field.label.toLowerCase()}`}</option>
                {field.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
          </div>
        ))}

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? 'Skickar...' : 'Skicka ärende'}
        </button>
        
        {message.text && (
          <div 
            className={`message ${message.isError ? 'error' : 'success'}`}
            style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '4px',
              backgroundColor: message.isError ? '#fee2e2' : '#dcfce7',
              color: message.isError ? '#dc2626' : '#16a34a',
              border: `1px solid ${message.isError ? '#fca5a5' : '#86efac'}`
            }}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default DynamiskForm;