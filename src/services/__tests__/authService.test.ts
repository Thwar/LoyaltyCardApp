import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import AuthService from '../authService';

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
}));

jest.mock('../firebase', () => ({
  auth: { currentUser: { email: 'test@example.com' } },
}));

describe('AuthService', () => {
  it('reauthenticateWithPassword uses credential and reauthenticate', async () => {
    const credential = {} as any;
    (EmailAuthProvider.credential as jest.Mock).mockReturnValue(credential);

    await AuthService.reauthenticateWithPassword('secret');

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('test@example.com', 'secret');
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, credential);
  });
});
