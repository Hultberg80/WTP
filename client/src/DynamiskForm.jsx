import { useState } from 'react';

function DynamiskForm() {
  const [companyType, setCompanyType] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    serviceType: '',
    issueType: '',
    message: '',
    registrationNumber: '',
    insuranceType: ''
  });

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
    
    let endpoint = '';
    let submitData = {
      firstName: formData.firstName,
      email: formData.email,
      companyType: companyType,
      message: formData.message,
      isChatActive: true,
      submittedAt: new Date().toISOString()
    };

    switch (companyType) {
      case 'Tele/Bredband':
        endpoint = '/api/tele';
        submitData = {
          ...submitData,
          serviceType: formData.serviceType,
          issueType: formData.issueType,
        };
        break;
      case 'Fordonsservice':
        endpoint = '/api/fordon';
        submitData = {
          ...submitData,
          registrationNumber: formData.registrationNumber,
          issueType: formData.issueType,
        };
        break;
      case 'Försäkringsärenden':
        endpoint = '/api/forsakring';
        submitData = {
          ...submitData,
          insuranceType: formData.insuranceType,
          issueType: formData.issueType,
        };
        break;
      default:
        setMessage({ text: 'Välj ett område', isError: true });
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          text: 'Formuläret har skickats! Kolla din e-post för chattlänken.', 
          isError: false 
        });
        setFormData({
          firstName: '',
          email: '',
          serviceType: '',
          issueType: '',
          message: '',
          registrationNumber: '',
          insuranceType: ''
        });
        setCompanyType('');
      } else {
        setMessage({ text: 'Ett fel uppstod vid skickandet av formuläret', isError: true });
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

  const renderTelecomFields = () => (
    <div className="field-group">
      <label htmlFor="serviceType">Typ av tjänst</label>
      <select
        name="serviceType"
        value={formData.serviceType}
        onChange={handleInputChange}
        required
      >
        <option value="">Välj tjänst</option>
        <option value="broadband">Bredband</option>
        <option value="mobile">Mobiltelefoni</option>
        <option value="landline">Fast telefoni</option>
        <option value="tv">TV-tjänster</option>
      </select>

      <label htmlFor="issueType">Vad gäller ditt ärende?</label>
      <select
        name="issueType"
        value={formData.issueType}
        onChange={handleInputChange}
        required
      >
        <option value="">Välj typ av ärende</option>
        <option value="technical">Tekniskt problem</option>
        <option value="billing">Fakturafrågor</option>
        <option value="change">Ändring av tjänst</option>
        <option value="cancel">Uppsägning</option>
        <option value="other">Övrigt</option>
      </select>
    </div>
  );
  
  const renderCarRepairFields = () => (
    <div>
      <label htmlFor="registrationNumber">Registreringsnummer</label>
      <input
        type="text"
        name="registrationNumber"
        placeholder="ABC123"
        value={formData.registrationNumber || ''}
        onChange={handleInputChange}
        required
      />

      <label htmlFor="issueType">Vad gäller ditt ärende?</label>
      <select
        name="issueType"
        value={formData.issueType}
        onChange={handleInputChange}
        required
      >
        <option value="">Välj typ av ärende</option>
        <option value="Problem efter reparation">Problem efter reparation</option>
        <option value="Garantiärende">Garantiärende</option>
        <option value="Reklamation">Reklamation</option>
        <option value="Kostnadsförfrågan">Kostnadsförfrågan</option>
        <option value="Reservdelsfrågor">Reservdelsfrågor</option>
        <option value="Övrigt">Övrigt</option>
      </select>
    </div>
  );

  const renderInsuranceFields = () => (
    <div>
      <label htmlFor="insuranceType">Typ av försäkring</label>
      <select
        name="insuranceType"
        value={formData.insuranceType || ''}
        onChange={handleInputChange}
        required
      >
        <option value="">Välj försäkringstyp</option>
        <option value="home">Hemförsäkring</option>
        <option value="car">Bilförsäkring</option>
        <option value="life">Livförsäkring</option>
        <option value="accident">Olycksfallsförsäkring</option>
      </select>

      <label htmlFor="issueType">Vad gäller ditt ärende?</label>
      <select
        name="issueType"
        value={formData.issueType}
        onChange={handleInputChange}
        required
      >
        <option value="">Välj typ av ärende</option>
        <option value="claim">Pågående skadeärende</option>
        <option value="coverage">Frågor om försäkringsskydd</option>
        <option value="billing">Fakturafrågor</option>
        <option value="changes">Ändring av försäkring</option>
        <option value="documents">Begäran om försäkringshandlingar</option>
      </select>
    </div>
  );

  return (
    <div className="container">
      <h1>Kontakta kundtjänst</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="companyType">Välj Företag</label>
        <select
          name="companyType"
          value={companyType}
          onChange={(e) => setCompanyType(e.target.value)}
          required
          disabled={isSubmitting}
        >
          <option value="">Välj område</option>
          <option value="Tele/Bredband">Tele/Bredband</option>
          <option value="Fordonsservice">Fordonsservice</option>
          <option value="Försäkringsärenden">Försäkringsärenden</option>
        </select>

        <label htmlFor="firstName">Namn</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
        />

        <label htmlFor="email">E-post</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
        />

        {companyType === 'Tele/Bredband' && renderTelecomFields()}
        {companyType === 'Fordonsservice' && renderCarRepairFields()}
        {companyType === 'Försäkringsärenden' && renderInsuranceFields()}

        <label htmlFor="message">Beskriv ditt ärende</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          placeholder="Beskriv ditt ärende i detalj..."
          required
          disabled={isSubmitting}
        />

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