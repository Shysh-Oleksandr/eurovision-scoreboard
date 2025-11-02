import { toast } from 'react-toastify';

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const parseAxiosError = (error: any) => {
  const message = Array.isArray(error?.response?.data?.message)
    ? error?.response?.data?.message[0]
    : error?.response?.data?.message;

  return capitalizeFirstLetter(message);
};

export const toastAxiosError = (
  error: any,
  fallbackMessage = 'Something went wrong. Please try again.',
) => {
  toast.error(parseAxiosError(error) || fallbackMessage);
};
