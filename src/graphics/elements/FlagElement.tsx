'use client';
import React from 'react';

import { FlagElement as FlagElementModel } from '../model/design';

import { maskStyle } from './ImageElement';

import {
  getFlagPathForImageGeneration,
  handleFlagError,
} from '@/helpers/getFlagPath';

const FlagElement: React.FC<{ el: FlagElementModel }> = ({ el }) => (
  <img
    src={getFlagPathForImageGeneration(el.countryCode, 'big-rectangle')}
    onError={(e) =>
      handleFlagError(e.currentTarget, el.countryCode, 'big-rectangle')
    }
    alt={el.countryCode}
    draggable={false}
    className="block w-full h-full object-cover"
    style={
      el.shape === 'heart'
        ? maskStyle('heart')
        : el.shape === 'round'
        ? maskStyle('circle')
        : maskStyle('none', 4)
    }
  />
);

export default FlagElement;
