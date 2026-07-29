import React, { IframeHTMLAttributes } from 'react';

export interface ConvertXEmbedProps extends IframeHTMLAttributes<HTMLIFrameElement> {
  /**
   * The URL of your hosted ConvertX instance.
   * Example: "https://convert.yourdomain.com"
   */
  url: string;
  className?: string;
}

export const ConvertXEmbed: React.FC<ConvertXEmbedProps> = ({
  url,
  className = '',
  ...props
}) => {
  return (
    <div className={`convertx-embed-container ${className}`} style={{ width: '100%', height: '100%', minHeight: '600px' }}>
      <iframe
        src={url}
        title="ConvertX Embed"
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
        referrerPolicy="no-referrer"
        loading="lazy"
        allow="cross-origin-isolated"
        {...props}
      />
    </div>
  );
};

export default ConvertXEmbed;
