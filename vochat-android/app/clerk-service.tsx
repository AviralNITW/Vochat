import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';

const CLERK_PUBLISHABLE_KEY = 'pk_test_dG9nZXRoZXItZGFuZS03Ny5jbGVyay5hY2NvdW50cy5kZXYk';
const CLERK_FRONTEND_API = 'https://together-dane-77.clerk.accounts.dev/v1';

const clerkClient = axios.create({
  baseURL: CLERK_FRONTEND_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clerkSignIn = async (email: string, password: string) => {
  try {
    const response = await clerkClient.post('/client/sign_ins?_clerk_js_version=4.70.0', {
      identifier: email,
      password: password,
    });
    
    const signInData = response.data;
    const signInStatus = signInData?.client?.active_sign_in?.status;
    const createdUserId = signInData?.client?.active_sign_in?.created_user_id || signInData?.client?.sessions?.[0]?.user_id;

    if (signInData?.client?.sessions?.[0]) {
      return {
        status: 'complete',
        createdUserId: createdUserId || 'clerk_user_id',
        sessionId: signInData.client.sessions[0].id,
      };
    }
    
    return {
      status: signInStatus || 'incomplete',
      createdUserId: createdUserId,
      raw: signInData,
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || 'Sign in failed';
    throw new Error(errorMsg);
  }
};

export const clerkSignUp = async (email: string, password: string, username: string) => {
  try {
    const response = await clerkClient.post('/client/sign_ups?_clerk_js_version=4.70.0', {
      email_address: email,
      password: password,
      username: username,
    });

    const signUpData = response.data;
    const signUpId = signUpData?.client?.active_sign_up?.id;
    
    if (signUpId) {
      await clerkClient.post(`/client/sign_ups/${signUpId}/prepare_verification?_clerk_js_version=4.70.0`, {
        strategy: 'email_code',
      });
    }

    return {
      signUpId: signUpId,
      status: signUpData?.client?.active_sign_up?.status || 'incomplete',
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || 'Sign up failed';
    throw new Error(errorMsg);
  }
};

export const clerkVerifySignUp = async (signUpId: string, code: string) => {
  try {
    const response = await clerkClient.post(`/client/sign_ups/${signUpId}/attempt_verification?_clerk_js_version=4.70.0`, {
      code: code,
    });

    const verifyData = response.data;
    const activeSignUp = verifyData?.client?.active_sign_up;
    const session = verifyData?.client?.sessions?.[0];

    if (session) {
      return {
        status: 'complete',
        createdUserId: session.user_id || activeSignUp?.created_user_id,
        sessionId: session.id,
      };
    }

    return {
      status: activeSignUp?.status || 'incomplete',
      createdUserId: activeSignUp?.created_user_id,
    };
  } catch (error: any) {
    const errorMsg = error.response?.data?.errors?.[0]?.message || error.message || 'Verification failed';
    throw new Error(errorMsg);
  }
};

// Clerk UI/Hooks Mocks for Expo Go
export const ClerkProvider = ({ children }: any) => {
  return <>{children}</>;
};

export const useUser = (): { user: any; isSignedIn: boolean; isLoaded: boolean } => {
  return {
    user: null,
    isSignedIn: false,
    isLoaded: true,
  };
};

export const useOAuth = ({ strategy }: { strategy: string }) => {
  return {
    startOAuthFlow: async (options?: any) => {
      Alert.alert('Social Login', `OAuth authentication (${strategy}) is mocked for Expo Go compatibility.`);
      return { createdSessionId: null as string | null, setActive: (async (params: any) => {}) as any };
    },
  };
};

export default function () {
  return null;
}
