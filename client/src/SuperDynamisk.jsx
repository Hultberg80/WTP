import { useState } from "react";


const SuperDynamiskForm = ({ formData }) => {
    const [formValues, setFormValues] = useState({});

    if(!formData) {
        return <p>Laddar formulär...</p>;
    } 

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;

        setFormValues(prevValues => ({
            ...prevValues,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Formulär skickat:", formValues);
    };

    return (
        <form className="dynamic-form" onSubmit={handleSubmit}>
            <h2>{formData.title}</h2>
            {formData.fields.map((field, index) => (
                <div key={index} className="form-group">
                    <label>{field.label}</label>

                    {field.type === "text" || field.type === "email" ? (
                        <input 
                            type={field.type} 
                            name={field.name} 
                            placeholder={field.placeholder} 
                            onChange={handleChange} 
                            className="form-input" 
                        />
                    ) : field.type === "textarea" ? (
                        <textarea 
                            name={field.name} 
                            placeholder={field.placeholder} 
                            onChange={handleChange} 
                            className="form-input"
                        ></textarea>
                    ) : field.type === "select" ? (
                        <select name={field.name} onChange={handleChange} className="form-input">
                            {field.options.map((option, i) => (
                                <option key={i} value={option}>{option}</option>
                            ))}
                        </select>
                    ) : field.type === "checkbox" && Array.isArray(field.options) ? (
                        field.options.map((option, i) => (
                            <label key={i} className="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    name={field.name} 
                                    value={option} 
                                    onChange={handleChange} 
                                /> {option}
                            </label>
                        ))
                    ) : field.type === "checkbox" ? (
                        <input 
                            type="checkbox" 
                            name={field.name} 
                            onChange={handleChange} 
                        />
                    ) : field.type === "file" ? (
                        <input 
                            type="file" 
                            name={field.name} 
                            className="form-input"
                        />
                    ) : null}
                </div>
            ))}
            <button type="submit" className="submit-button">Skicka</button>
        </form>
    );
};

export default SuperDynamiskForm;
