// Validation service for input validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  details?: Record<string, string>;
}

export class ValidationService {
  static validateEmail(email: string): ValidationResult {
    if (!email) {
      return {
        isValid: false,
        errors: ['Email is required'],
        details: { email: 'Email is required' }
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        errors: ['Invalid email format'],
        details: { email: 'Email must be in a valid format' }
      };
    }

    return { isValid: true, errors: [] };
  }

  static validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return {
        isValid: false,
        errors: ['Phone number is required'],
        details: { phone: 'Phone number is required' }
      };
    }

    // UK and international phone numbers (e.g. 07123 456789 or +44 7123 456789)
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+?[0-9]{8,15})$/;
    if (!phoneRegex.test(cleanPhone)) {
      return {
        isValid: false,
        errors: ['Invalid phone number format'],
        details: { phone: 'Please enter a valid UK phone number (e.g. 07123 456789 or +44 7123 456789)' }
      };
    }

    return { isValid: true, errors: [] };
  }

  static validateName(name: string): ValidationResult {
    if (!name) {
      return {
        isValid: false,
        errors: ['Name is required'],
        details: { name: 'Name is required' }
      };
    }

    const nameRegex = /^[a-zA-Z\s\-'.]{2,60}$/;
    if (!nameRegex.test(name.trim())) {
      return {
        isValid: false,
        errors: ['Name must be between 2 and 60 characters'],
        details: { name: 'Name must be between 2 and 60 characters and contain letters only' }
      };
    }

    return { isValid: true, errors: [] };
  }

  static validatePassword(password: string): ValidationResult {
    if (!password) {
      return {
        isValid: false,
        errors: ['Password is required'],
        details: { password: 'Password is required' }
      };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
        details: { password: 'Password must be at least 8 characters long' }
      };
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        errors: ['Password must contain at least one letter and one number'],
        details: { password: 'Password must contain at least one letter and one number' }
      };
    }

    return { isValid: true, errors: [] };
  }
}
