import React, { useState } from 'react';

// Design tokens from Moovs design system
const tokens = {
  colors: {
    black: '#1E1E1E',
    grayDark: '#999999',
    grayLight: '#EDEDED',
    white: '#FFFFFF',
    moovsBlue: '#195FE9',
    moovsBlueHover: '#739CFF',
  },
  typography: {
    h3: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
      fontSize: '20px',
      lineHeight: '28px',
      letterSpacing: '-0.15px',
    },
    h4: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      lineHeight: '24px',
      letterSpacing: '0.1px',
    },
    body2: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 400,
      fontSize: '14px',
      lineHeight: '20px',
    },
    buttonLarge: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 500,
      fontSize: '16px',
      lineHeight: '18px',
      letterSpacing: '-0.25px',
    },
  },
  shadows: {
    buttonDefault: '0px 2px 3px -1px rgba(30,30,30,0.1), 0px 8px 10px -2px rgba(30,30,30,0.12)',
    modalStrong: '0px 2px 4px -0.8px rgba(24,39,75,0.04), 0px 12px 14px -2px rgba(24,39,75,0.04), 0px 32px 40px -2.5px rgba(24,39,75,0.02)',
  },
};

// Types
type LocationType = 'no-location' | 'specific-location';

interface Location {
  id: string;
  name: string;
  type: 'airport' | 'city' | 'zone' | 'custom';
}

interface DynamicPricingRule {
  locationType: LocationType;
  selectedLocations: Location[];
  adjustmentType: 'percentage' | 'flat';
  adjustmentValue: number;
}

// Close Icon Component
const CloseIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    aria-label="Close modal"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 6L6 18M6 6L18 18"
        stroke={tokens.colors.black}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

// Radio Button Component
interface RadioButtonProps {
  selected: boolean;
  label: string;
  onChange: () => void;
  name: string;
}

const RadioButton: React.FC<RadioButtonProps> = ({ selected, label, onChange, name }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
    }}
  >
    <input
      type="radio"
      name={name}
      checked={selected}
      onChange={onChange}
      style={{ display: 'none' }}
    />
    <div
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: `2px solid ${selected ? tokens.colors.moovsBlue : tokens.colors.moovsBlue}`,
        backgroundColor: tokens.colors.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      {selected && (
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: tokens.colors.moovsBlue,
          }}
        />
      )}
    </div>
    <span style={{ ...tokens.typography.body2, color: tokens.colors.black }}>
      {label}
    </span>
  </label>
);

// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant, onClick, children, disabled }) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...tokens.typography.buttonLarge,
        padding: '14px 18px',
        borderRadius: '4px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: isPrimary ? tokens.colors.moovsBlue : 'transparent',
        color: isPrimary ? tokens.colors.white : tokens.colors.moovsBlue,
        boxShadow: isPrimary ? tokens.shadows.buttonDefault : 'none',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
};

// Location Selector Component (shown when "Specific location" is selected)
interface LocationSelectorProps {
  selectedLocations: Location[];
  onLocationChange: (locations: Location[]) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocations,
  onLocationChange
}) => {
  // Mock locations for prototype
  const availableLocations: Location[] = [
    { id: '1', name: 'LAX - Los Angeles International', type: 'airport' },
    { id: '2', name: 'JFK - John F. Kennedy International', type: 'airport' },
    { id: '3', name: 'Downtown Los Angeles', type: 'zone' },
    { id: '4', name: 'Santa Monica', type: 'city' },
    { id: '5', name: 'Beverly Hills', type: 'city' },
  ];

  const toggleLocation = (location: Location) => {
    const isSelected = selectedLocations.some(l => l.id === location.id);
    if (isSelected) {
      onLocationChange(selectedLocations.filter(l => l.id !== location.id));
    } else {
      onLocationChange([...selectedLocations, location]);
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <p style={{
        ...tokens.typography.body2,
        color: tokens.colors.grayDark,
        marginBottom: '12px'
      }}>
        Select one or more locations to apply the pricing rule:
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {availableLocations.map(location => {
          const isSelected = selectedLocations.some(l => l.id === location.id);
          return (
            <label
              key={location.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '4px',
                border: `1px solid ${isSelected ? tokens.colors.moovsBlue : tokens.colors.grayLight}`,
                backgroundColor: isSelected ? '#F0F5FF' : tokens.colors.white,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleLocation(location)}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${isSelected ? tokens.colors.moovsBlue : tokens.colors.grayDark}`,
                  backgroundColor: isSelected ? tokens.colors.moovsBlue : tokens.colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke={tokens.colors.white}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <span style={{ ...tokens.typography.body2, color: tokens.colors.black }}>
                  {location.name}
                </span>
                <span style={{
                  ...tokens.typography.body2,
                  color: tokens.colors.grayDark,
                  marginLeft: '8px',
                  textTransform: 'capitalize',
                }}>
                  ({location.type})
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// Main Modal Component
interface DynamicPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: DynamicPricingRule) => void;
}

export const DynamicPricingModal: React.FC<DynamicPricingModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [locationType, setLocationType] = useState<LocationType>('no-location');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);

  if (!isOpen) return null;

  const handleNext = () => {
    // In a full implementation, this would navigate to the next step
    // For the prototype, we'll just log the selection
    console.log('Location type:', locationType);
    console.log('Selected locations:', selectedLocations);

    onSave({
      locationType,
      selectedLocations,
      adjustmentType: 'percentage',
      adjustmentValue: 0,
    });
  };

  const canProceed = locationType === 'no-location' || selectedLocations.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: tokens.colors.white,
          borderRadius: '4px',
          boxShadow: tokens.shadows.modalStrong,
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: tokens.colors.white }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '24px 24px 0 24px',
            }}
          >
            <h2 style={{ ...tokens.typography.h3, color: tokens.colors.black, margin: 0 }}>
              Adjust Base Rate for a Specific Date
            </h2>
            <CloseIcon onClick={onClose} />
          </div>
          <div
            style={{
              height: '24px',
              borderBottom: `1px solid ${tokens.colors.grayLight}`,
            }}
          />
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ ...tokens.typography.h4, color: tokens.colors.black, margin: '0 0 16px 0' }}>
            Choose Location
          </h3>

          <div style={{ display: 'flex', gap: '24px', padding: '8px 0' }}>
            <RadioButton
              name="locationType"
              selected={locationType === 'no-location'}
              label="No location"
              onChange={() => {
                setLocationType('no-location');
                setSelectedLocations([]);
              }}
            />
            <RadioButton
              name="locationType"
              selected={locationType === 'specific-location'}
              label="Specific location"
              onChange={() => setLocationType('specific-location')}
            />
          </div>

          {locationType === 'specific-location' && (
            <LocationSelector
              selectedLocations={selectedLocations}
              onLocationChange={setSelectedLocations}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '16px 24px',
            borderTop: `1px solid ${tokens.colors.grayLight}`,
            backgroundColor: tokens.colors.white,
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Go Back
          </Button>
          <Button variant="primary" onClick={handleNext} disabled={!canProceed}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

// Demo App Component
export const DynamicPricingDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [savedRule, setSavedRule] = useState<DynamicPricingRule | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{ padding: '24px' }}>
        <h1 style={{ ...tokens.typography.h3, marginBottom: '16px' }}>
          Dynamic Pricing - Location Based Rules
        </h1>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Create New Rule
        </Button>

        {savedRule && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: tokens.colors.white,
            borderRadius: '4px',
            border: `1px solid ${tokens.colors.grayLight}`,
          }}>
            <h3 style={{ ...tokens.typography.h4, marginBottom: '8px' }}>
              Saved Rule:
            </h3>
            <pre style={{
              ...tokens.typography.body2,
              backgroundColor: '#F5F5F5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
            }}>
              {JSON.stringify(savedRule, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <DynamicPricingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(rule) => {
          setSavedRule(rule);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default DynamicPricingDemo;
