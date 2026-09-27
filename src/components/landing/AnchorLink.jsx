import { scrollToId } from './Navbar.jsx';

// In-page anchor that scrolls smoothly and works with both Browser and Hash routers.
export default function AnchorLink({ href, children, ...rest }) {
  return (
    <a href={href} onClick={(e) => scrollToId(e, href)} {...rest}>
      {children}
    </a>
  );
}
