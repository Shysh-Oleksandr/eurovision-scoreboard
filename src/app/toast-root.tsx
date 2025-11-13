'use client';

import React from 'react';
import { ToastContainer, Zoom } from 'react-toastify';

import { CheckIcon } from '@/assets/icons/CheckIcon';
import { CircleXIcon } from '@/assets/icons/CircleXIcon';
import { InfoIcon } from '@/assets/icons/InfoIcon';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';

export default function ToastRoot() {
  return (
    <ToastContainer
      draggable
      draggablePercent={20}
      transition={Zoom}
      theme="dark"
      closeButton={false}
      autoClose={2000}
      toastClassName={(context) => {
        const baseClassName = `${context?.defaultClassName} leading-5 bg-gradient-to-tl text-white`;

        if (context?.type === 'error') {
          return `${baseClassName} from-red-900 to-red-800 bg-red-800`;
        }
        if (context?.type === 'warning') {
          return `${baseClassName} from-yellow-900 to-yellow-800 bg-yellow-800`;
        }

        return `${baseClassName} from-primary-900 to-primary-800 bg-primary-800`;
      }}
      progressClassName={(context) => {
        const baseClassName = `${context?.defaultClassName} bg-gradient-to-r`;

        if (context?.type === 'error') {
          return `${baseClassName} from-red-800 to-red-600 bg-red-800`;
        }
        if (context?.type === 'warning') {
          return `${baseClassName} from-yellow-500 to-yellow-400 bg-yellow-500`;
        }

        return `${baseClassName} from-primary-900 to-primary-700 bg-primary-800`;
      }}
      limit={3}
      icon={(props) => {
        if (props.type === 'success') {
          return <CheckIcon />;
        }
        if (props.type === 'error') {
          return <CircleXIcon />;
        }
        if (props.type === 'warning') {
          return <TriangleAlertIcon />;
        }

        return <InfoIcon className="w-6 h-6" />;
      }}
    />
  );
}
