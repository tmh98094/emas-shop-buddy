import DOMPurify from 'dompurify';

interface SafeHtmlContentProps {
  content: string;
  className?: string;
}

/**
 * SafeHtmlContent - Renders HTML content with defense-in-depth sanitization
 * 
 * This component provides an additional layer of XSS protection by sanitizing
 * HTML content at render time, even if it was already sanitized before storage.
 * This follows security best practices for defense-in-depth.
 */
export function SafeHtmlContent({ content, className = "" }: SafeHtmlContentProps) {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'ul', 'ol', 'li',
      'a', 'strong', 'em', 'u', 's',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
    />
  );
}
