// Importerar nödvändiga hooks från React
import { createContext, useContext, useState, useEffect } from 'react';

// Skapar ett nytt context-objekt för autentisering
const AuthContext = createContext();

// AuthProvider-komponenten omsluter delar av applikationen som behöver autentisering
export const AuthProvider = ({ children }) => {
  // State för att lagra användardata (null om ingen användare är inloggad)
  const [user, setUser] = useState(null);
  // State för att indikera om en användare är inloggad (false som standard)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // State för att indikera om applikationen laddar autentiseringsdata (true initialt)
  const [loading, setLoading] = useState(true);
  
  // useEffect körs en gång vid komponentens mount för att kontrollera om en inloggning redan finns sparad
  useEffect(() => {
    const checkExistingLogin = async () => {
      try {
        // Försöker hämta sparad användardata från localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          // Om data finns, parsa JSON-strängen
          const parsedUser = JSON.parse(storedUser);
          
          // Förbättra användardata genom att lägga till en logo-path baserat på användarens företag
          const enhancedUser = {
            ...parsedUser,
            companyLogo: getCompanyLogoPath(parsedUser.company)
          };
          
          // Uppdatera state med den förbättrade användardatan och sätt inloggningsstatus till true
          setUser(enhancedUser);
          setIsLoggedIn(true);
        }
      } catch (error) {
        // Logga fel om sessionen inte kunde återställas
        console.error('Failed to restore user session:', error);
      } finally {
        // Oavsett utfall, avsluta laddningstillståndet
        setLoading(false);
      }
    };
    
    // Anropa funktionen för att kontrollera befintlig inloggning
    checkExistingLogin();
  }, []); // Tom array betyder att detta bara körs en gång vid mount
  
  // Hjälpfunktion som returnerar en logotyps sökväg baserat på företagsnamnet
  const getCompanyLogoPath = (company) => {
    switch(company) {
      case 'fordon':
        return '/img/company-logos/fordon.jpeg';
      case 'tele':
        return '/img/company-logos/tele.jpeg';
      case 'forsakring':
        return '/img/company-logos/forsakring.jpeg';
      default:
        return null;
    }
  };
  
  // Login-funktion som tar emot användardata (t.ex. från ett formulär)
  const login = async (userData) => {
    try {
      // Förbättra användardata genom att lägga till logotyp-sökvägen baserat på företag
      const enhancedUserData = {
        ...userData,
        companyLogo: getCompanyLogoPath(userData.company)
      };
      
      // Spara den förbättrade användardatan i state och sätt inloggningsstatus till true
      setUser(enhancedUserData);
      setIsLoggedIn(true);
      // Spara användardatan i localStorage för att återställa sessionen vid nästa besök
      localStorage.setItem('user', JSON.stringify(enhancedUserData));
      
      // Returnera ett objekt som indikerar att inloggningen lyckades
      return { success: true };
    } catch (error) {
      // Logga fel och returnera ett objekt med felmeddelande
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  };
  
  // Logout-funktion som rensar användardata och inloggningsstatus
  const logout = async () => {
    try {
      // Nollställ användardata och inloggningsstatus
      setUser(null);
      setIsLoggedIn(false);
      // Ta bort användardata från localStorage
      localStorage.removeItem('user');
      
      // Returnera ett objekt som indikerar att utloggningen lyckades
      return { success: true };
    } catch (error) {
      // Logga fel och returnera ett objekt med misslyckat resultat
      console.error('Logout error:', error);
      return { success: false };
    }
  };
  
  // Returnerar AuthContext.Provider som omsluter barn-komponenterna
  // Värdet som skickas med innehåller användardata, inloggningsstatus, laddningstillstånd samt login- och logout-funktioner
  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn, 
      loading, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook för att enkelt använda AuthContext i andra komponenter
export const useAuth = () => {
  // Hämtar contextet med useContext-hooken
  const context = useContext(AuthContext);
  // Om contextet inte finns (vilket betyder att hooken använts utanför en AuthProvider), kasta ett fel
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Returnera det hämtade context-värdet
  return context;
};

export default AuthContext;