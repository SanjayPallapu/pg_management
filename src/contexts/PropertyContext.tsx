import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Property {
  id: string;
  name: string;
  address?: string;
  logo_url?: string;
}

interface PropertyContextType {
  properties: Property[];
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property) => void;
  isLoading: boolean;
  refetch: () => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedPropertyState] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('name');

    if (!error && data) {
      setProperties(data);
      
      // Restore selected property from localStorage or use first property
      const storedPropertyId = localStorage.getItem('selectedPropertyId');
      const storedProperty = data.find(p => p.id === storedPropertyId);
      
      if (storedProperty) {
        setSelectedPropertyState(storedProperty);
      } else if (data.length > 0) {
        setSelectedPropertyState(data[0]);
        localStorage.setItem('selectedPropertyId', data[0].id);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const setSelectedProperty = (property: Property) => {
    setSelectedPropertyState(property);
    localStorage.setItem('selectedPropertyId', property.id);
  };

  return (
    <PropertyContext.Provider value={{ 
      properties, 
      selectedProperty, 
      setSelectedProperty, 
      isLoading,
      refetch: fetchProperties 
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};
