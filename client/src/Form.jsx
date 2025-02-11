
import { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

function Form(){
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        gender: '',
        subject: 'math',
        about: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage('');
    
        try {
            console.log('Sending data to:', `${API_BASE_URL}/formsubmissions`);
            const response = await fetch(`${API_BASE_URL}/formsubmissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    submittedAt: new Date().toISOString(),
                    isChatActive: true
                })
            });
    
            if (response.ok) {
                const result = await response.json();
                console.log('Success:', result);
                setSubmitMessage('Formuläret har skickats! Kolla din e-post för chattlänken.');
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    gender: '',
                    subject: 'math',
                    about: ''
                });
            } else {
                console.error('Server error:', response.status);
                setSubmitMessage('Ett fel uppstod. Försök igen.');
            }
        } catch (error) {
            console.error('Error:', error);
            setSubmitMessage('Ett fel uppstod vid anslutning till servern.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            gender: '',
            subject: 'math',
            about: ''
        });
        setSubmitMessage('');
    };

    return (
        <div className="container">
            <h1>Formulär</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="firstName">Förnamn</label>
                <input 
                    type="text" 
                    placeholder="Ange förnamn" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required 
                />

                <label htmlFor="lastName">Efternamn</label>
                <input 
                    type="text" 
                    placeholder="Ange efternamn" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required 
                />

                <label htmlFor="email">E-post</label>
                <input 
                    type="email" 
                    placeholder="Ange e-post" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required 
                />

                <label htmlFor="gender">Kön</label>
                <div>
                    <input 
                        type="radio" 
                        name="gender" 
                        value="male"
                        checked={formData.gender === 'male'}
                        onChange={handleInputChange}
                    /> Man
                    <input 
                        type="radio" 
                        name="gender" 
                        value="female"
                        checked={formData.gender === 'female'}
                        onChange={handleInputChange}
                    /> Kvinna
                </div>

                <label htmlFor="subject">Ämne</label>
                <select 
                    name="subject" 
                    value={formData.subject}
                    onChange={handleInputChange}
                >
                    <option value="math">Matematik</option>
                    <option value="physics">Fysik</option>
                    <option value="english">Engelska</option>
                </select>

                <label htmlFor="about">Om dig</label>
                <textarea 
                    name="about"
                    value={formData.about}
                    onChange={handleInputChange}
                    placeholder="Beskriv dig själv"
                    required
                />

                {submitMessage && (
                    <div className={submitMessage.includes('fel') ? 'error-message' : 'success-message'}>
                        {submitMessage}
                    </div>
                )}

                <button type="button" onClick={handleReset} disabled={isSubmitting}>
                    Återställ
                </button>
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Skickar...' : 'Skicka'}
                </button>
            </form>
        </div>
    );
}

export default Form;