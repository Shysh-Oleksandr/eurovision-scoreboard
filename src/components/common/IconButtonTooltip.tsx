'use client';

import React, {
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useTouchDevice } from '@/hooks/useTouchDevice';

type Props = {
  content: string;
  children: ReactNode;
  className?: string;
};

const TOOLTIP_GAP = 6;
const VIEWPORT_MARGIN = 8;

const mergeRefs = <T,>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> => {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
};

const IconButtonTooltip = ({ content, children, className = '' }: Props) => {
  const isTouchDevice = useTouchDevice();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      setIsVisible(false);

      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    if (left < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN;
    } else if (left + tooltipRect.width > viewportWidth - VIEWPORT_MARGIN) {
      left = viewportWidth - tooltipRect.width - VIEWPORT_MARGIN;
    }

    let top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;

    if (top < VIEWPORT_MARGIN) {
      top = triggerRect.bottom + TOOLTIP_GAP;
    }

    setTooltipStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 9999,
      visibility: 'visible',
    });

    const animationFrame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isOpen, content]);

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsVisible(false);
      setIsOpen(false);
      setTooltipStyle({ visibility: 'hidden' });
    }
  };

  const child = React.Children.only(children) as ReactElement<{
    className?: string;
    onMouseEnter?: React.MouseEventHandler<HTMLElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLElement>;
    ref?: React.Ref<HTMLElement>;
  }>;

  const trigger = React.cloneElement(child, {
    ref: mergeRefs(triggerRef, (child as any).ref),
    className: [child.props.className, className].filter(Boolean).join(' '),
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      child.props.onMouseEnter?.(event);
      handleMouseEnter();
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      child.props.onMouseLeave?.(event);
      handleMouseLeave();
    },
  });

  return (
    <>
      {trigger}
      {isOpen &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className={`pointer-events-none whitespace-nowrap rounded px-2 py-1 text-xs font-medium normal-case tracking-normal text-white/90 bg-black bg-gradient-to-t from-primary-900/60 to-primary-800/50 shadow-md transition-all duration-200 ease-out ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-1'
            }`}
            style={tooltipStyle}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
};

export default IconButtonTooltip;
