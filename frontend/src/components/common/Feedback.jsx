export function ErrorNotice({message}){return message?<p className="notice error-notice" role="alert">{message}</p>:null;}
export function Loading(){return <p className="notice" role="status">Loading your workspace…</p>;}
export function Empty({title,children}){return <div className="empty-state"><h2>{title}</h2><div>{children}</div></div>;}
export function Field({label,id,...props}){return <div className="field"><label htmlFor={id}>{label}</label><input id={id} {...props}/></div>;}

