export default function MobileNavDrawer({ items, onClose }) {
  return (
    <div className="ph-mobile-overlay" onClick={onClose}>
      <div className="ph-mobile-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ph-mobile-drawer-header">
          <span>NAVIGATION</span>
          <button className="ph-mobile-close" onClick={onClose}>✕</button>
        </div>

        <div className="ph-mobile-drawer-body">
          {items.map((item, i) =>
            item === "separator" ? (
              <div key={i} className="ph-mobile-nav-separator" />
            ) : item?.type === "label" ? (
              <div key={i} className="ph-mobile-nav-label">{item.text}</div>
            ) : (
              <button
                key={i}
                className={[
                  "ph-mobile-nav-btn",
                  item.danger ? "ph-mobile-nav-btn-danger" : "",
                  item.active ? "ph-mobile-nav-btn-active" : "",
                ].join(" ")}
                onClick={() => { item.onClick(); onClose(); }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
