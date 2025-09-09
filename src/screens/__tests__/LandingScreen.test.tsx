import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LandingScreen } from '../LandingScreen';

describe('LandingScreen', () => {
  it('navigates to Register when Comenzar pressed', () => {
    const navigate = jest.fn();
    const { getByText } = render(<LandingScreen navigation={{ navigate } as any} />);
    fireEvent.press(getByText('Comenzar'));
    expect(navigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to Login when Ya Tengo una Cuenta pressed', () => {
    const navigate = jest.fn();
    const { getByText } = render(<LandingScreen navigation={{ navigate } as any} />);
    fireEvent.press(getByText('Ya Tengo una Cuenta'));
    expect(navigate).toHaveBeenCalledWith('Login');
  });
});
