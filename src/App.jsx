import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  CircleUserRound,
  Edit3,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  ensureSupabaseSession,
  isSupabaseConfigured,
  readLocalPortfolio,
  removeLocalPortfolio,
  supabase,
  writeLocalPortfolio,
} from './lib/supabase'

const emptyPortfolio = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  about: '',
  education: '',
  skills: '',
  projects: [{ title: '', description: '' }],
  experience: [{ role: '', company: '', description: '' }],
  social_links: '',
  profile_picture_url: '',
  template_id: 'simple',
}

const templates = [
  { id: 'simple', name: 'Simple', eyebrow: 'Clean & focused', description: 'A polished, editorial portfolio for your core story.', icon: FileText, color: '#d9f0d7' },
  { id: 'modern', name: 'Modern', eyebrow: 'Bold & visual', description: 'Cards, highlights, and a contemporary visual rhythm.', icon: LayoutTemplate, color: '#ffd9c7' },
  { id: 'creative', name: 'Creative', eyebrow: 'Playful & unique', description: 'A expressive layout with color, motion, and personality.', icon: Sparkles, color: '#d9dcff' },
]

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'form', label: 'Portfolio info' },
  { id: 'templates', label: 'Templates' },
  { id: 'preview', label: 'Preview' },
  { id: 'manage', label: 'Manage' },
]

function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

function SectionHeading({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <div className="section-icon"><Icon size={20} /></div>
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
    </div>
  )
}

function App() {
  const [view, setView] = useState('home')
  const [portfolio, setPortfolio] = useState(emptyPortfolio)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true
    const initialize = async () => {
      try {
        if (!isSupabaseConfigured) {
          const savedPortfolio = readLocalPortfolio()
          if (savedPortfolio) {
            setPortfolio({ ...emptyPortfolio, ...savedPortfolio, projects: savedPortfolio.projects || [], experience: savedPortfolio.experience || [] })
          }
          setUser({ id: 'local-user', email: 'local@portio.app' })
          setLoading(false)
          return
        }

        const session = await ensureSupabaseSession()
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user && supabase) {
          const { data, error: fetchError } = await supabase.from('portfolios').select('*').eq('user_id', session.user.id).maybeSingle()
          if (fetchError) throw fetchError
          if (data) setPortfolio({ ...emptyPortfolio, ...data, projects: data.projects || [], experience: data.experience || [] })
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not connect to the database.')
      } finally {
        if (active) setLoading(false)
      }
    }
    initialize()
    return () => { active = false }
  }, [])

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === portfolio.template_id) || templates[0], [portfolio.template_id])

  const updateField = (field, value) => {
    setPortfolio((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  const updateList = (key, index, field, value) => {
    setPortfolio((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }))
  }

  const addListItem = (key, emptyItem) => {
    setPortfolio((current) => ({ ...current, [key]: [...current[key], emptyItem] }))
  }

  const removeListItem = (key, index) => {
    setPortfolio((current) => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }))
  }

  const savePortfolio = async (event) => {
    if (event) event.preventDefault()

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...portfolio,
        user_id: user?.id || 'local-user',
        projects: portfolio.projects.filter((item) => item.title || item.description),
        experience: portfolio.experience.filter((item) => item.role || item.company || item.description),
      }

      if (!isSupabaseConfigured || !supabase || !user) {
        writeLocalPortfolio(payload)
        setMessage('Portfolio saved locally. Add your Supabase credentials later to sync this data to the cloud.')
        setView('preview')
        return
      }

      const { error: saveError } = await supabase.from('portfolios').upsert(payload, { onConflict: 'user_id' })
      if (saveError) throw saveError
      setMessage('Portfolio saved successfully. Your data is stored online and will remain available after refresh.')
      setView('preview')
    } catch (err) {
      setError(err.message || 'Your portfolio could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const deletePortfolio = async () => {
    if (!window.confirm('Delete your saved portfolio? This cannot be undone.')) return
    try {
      if (!isSupabaseConfigured || !supabase || !user) {
        removeLocalPortfolio()
        setPortfolio(emptyPortfolio)
        setView('home')
        setMessage('Portfolio deleted from local storage. You can create a new one at any time.')
        return
      }

      const { error: deleteError } = await supabase.from('portfolios').delete().eq('user_id', user.id)
      if (deleteError) throw deleteError
      setPortfolio(emptyPortfolio)
      setView('home')
      setMessage('Portfolio deleted. You can create a new one at any time.')
    } catch (err) {
      setError(err.message || 'The portfolio could not be deleted.')
    }
  }

  const goTo = (nextView) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <div className="loading"><div className="loader" /><p>Preparing your portfolio…</p></div>

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => goTo('home')} aria-label="Home"><span className="brand-mark">P</span><span>portio</span></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => goTo(item.id)}>{item.label}</button>)}
        </nav>
        <button className="header-cta" onClick={() => goTo('form')}><Plus size={17} /> Create portfolio</button>
      </header>

      <main>
        {error && <div className="alert error"><span>{error}</span><button onClick={() => setError('')}><X size={18} /></button></div>}
        {message && <div className="alert success"><span>{message}</span><button onClick={() => setMessage('')}><X size={18} /></button></div>}

        {view === 'home' && <HomeView onStart={() => goTo('form')} />}

        {view === 'form' && (
          <section className="page-section form-page">
            <div className="page-intro"><p className="eyebrow">Build your profile</p><h1>Tell your story.<br /><em>Make it yours.</em></h1><p>Enter your details once. Your portfolio is saved securely to the cloud and can be edited whenever you like.</p></div>
            <form className="form-layout" onSubmit={savePortfolio}>
              <div className="form-main">
                <SectionHeading icon={CircleUserRound} eyebrow="Personal details" title="About you" description="The basics that help visitors recognize and connect with you." />
                <div className="form-grid">
                  <Field label="Full name"><div className="input-icon"><UserRound size={17} /><input value={portfolio.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="Alex Morgan" required /></div></Field>
                  <Field label="Email address"><div className="input-icon"><Mail size={17} /><input type="email" value={portfolio.email} onChange={(e) => updateField('email', e.target.value)} placeholder="alex@example.com" required /></div></Field>
                  <Field label="Contact number"><div className="input-icon"><Phone size={17} /><input type="tel" value={portfolio.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 555 010 2040" /></div></Field>
                  <Field label="Location"><div className="input-icon"><MapPin size={17} /><input value={portfolio.address} onChange={(e) => updateField('address', e.target.value)} placeholder="City, Country" /></div></Field>
                  <Field label="Profile picture URL" hint="Use a public image URL for the quickest setup."><div className="input-icon"><CircleUserRound size={17} /><input type="url" value={portfolio.profile_picture_url} onChange={(e) => updateField('profile_picture_url', e.target.value)} placeholder="https://images.example.com/profile.jpg" /></div></Field>
                  <Field label="Social links / website"><div className="input-icon"><Sparkles size={17} /><input value={portfolio.social_links} onChange={(e) => updateField('social_links', e.target.value)} placeholder="LinkedIn, GitHub, portfolio URL" /></div></Field>
                  <Field label="About me"><textarea value={portfolio.about} onChange={(e) => updateField('about', e.target.value)} placeholder="Write a short introduction about your goals, strengths, and what you do." required /></Field>
                  <Field label="Educational background"><textarea value={portfolio.education} onChange={(e) => updateField('education', e.target.value)} placeholder="Degree, institution, location, graduation year…" /></Field>
                  <Field label="Skills"><textarea value={portfolio.skills} onChange={(e) => updateField('skills', e.target.value)} placeholder="Design, React, Product strategy, User research…" /></Field>
                </div>

                <div className="form-section"><SectionHeading icon={WandSparkles} eyebrow="Projects" title="Work you have created" description="Share your most meaningful projects and the impact they made." />
                  {portfolio.projects.map((project, index) => <div className="entry-card" key={`project-${index}`}>
                    <div className="entry-card-head"><span>{String(index + 1).padStart(2, '0')}</span><button type="button" onClick={() => removeListItem('projects', index)}><Trash2 size={16} /></button></div>
                    <div className="form-grid"><Field label="Project name"><input value={project.title} onChange={(e) => updateList('projects', index, 'title', e.target.value)} placeholder="Portfolio website" /></Field><Field label="Project summary"><textarea value={project.description} onChange={(e) => updateList('projects', index, 'description', e.target.value)} placeholder="What did you build and what changed?" /></Field></div>
                  </div>)}
                  <button type="button" className="text-button" onClick={() => addListItem('projects', { title: '', description: '' })}><Plus size={17} /> Add another project</button>
                </div>

                <div className="form-section"><SectionHeading icon={GraduationCap} eyebrow="Experience" title="Your journey" description="Add roles, companies, and the value you delivered." />
                  {portfolio.experience.map((item, index) => <div className="entry-card" key={`experience-${index}`}>
                    <div className="entry-card-head"><span>{String(index + 1).padStart(2, '0')}</span><button type="button" onClick={() => removeListItem('experience', index)}><Trash2 size={16} /></button></div>
                    <div className="form-grid"><Field label="Role"><input value={item.role} onChange={(e) => updateList('experience', index, 'role', e.target.value)} placeholder="Product Designer" /></Field><Field label="Company"><input value={item.company} onChange={(e) => updateList('experience', index, 'company', e.target.value)} placeholder="Acme Studio" /></Field><Field label="Impact"><textarea value={item.description} onChange={(e) => updateList('experience', index, 'description', e.target.value)} placeholder="Describe your responsibilities and results." /></Field></div>
                  </div>)}
                  <button type="button" className="text-button" onClick={() => addListItem('experience', { role: '', company: '', description: '' })}><Plus size={17} /> Add another role</button>
                </div>
              </div>

              <aside className="form-sidebar">
                <div className="save-card"><span className="save-icon"><Save size={22} /></span><h3>Ready to save?</h3><p>{isSupabaseConfigured ? 'Your portfolio will be stored in a secure cloud database and can be edited later.' : 'Your portfolio will be stored locally in this browser until you connect Supabase.'}</p><button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Saving…' : isSupabaseConfigured ? 'Save to database' : 'Save locally'} <ArrowRight size={18} /></button><small>{isSupabaseConfigured ? 'Stored safely with your Supabase project.' : 'Local save works without any setup.'}</small></div>
                <div className="tip-card"><Sparkles size={20} /><p><strong>Quick tip</strong> Keep the introduction under 100 words for a strong first impression.</p></div>
              </aside>
            </form>
          </section>
        )}

        {view === 'templates' && <TemplateView portfolio={portfolio} selectedTemplate={portfolio.template_id} onSelect={(id) => updateField('template_id', id)} onContinue={() => goTo('preview')} />}

        {view === 'preview' && <PreviewView portfolio={portfolio} selectedTemplate={selectedTemplate} onEdit={() => goTo('form')} onChoose={() => goTo('templates')} onSave={savePortfolio} saving={saving} />}

        {view === 'manage' && <ManageView portfolio={portfolio} user={user} onEdit={() => goTo('form')} onSelectTemplate={() => goTo('templates')} onPreview={() => goTo('preview')} onDelete={deletePortfolio} />}
      </main>

      <footer><div className="brand"><span className="brand-mark">P</span><span>portio</span></div><p>Make your story visible.</p><span>Built for ambitious creators.</span></footer>
    </div>
  )
}

function HomeView({ onStart }) {
  return <section className="hero">
    <div className="hero-copy"><p className="eyebrow">Your story, beautifully presented</p><h1>Build a portfolio<br />that feels <em>like you.</em></h1><p className="hero-description">Create a polished online portfolio in minutes. Add your work, choose a style, and publish your story—without the complicated setup.</p><div className="hero-actions"><button className="primary-button" onClick={onStart}>Create portfolio <ArrowRight size={18} /></button><button className="secondary-button" onClick={() => document.querySelector('.how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>See how it works</button></div><div className="trust-row"><span><Check size={15} /> Secure cloud storage</span><span><Check size={15} /> Three unique styles</span><span><Check size={15} /> Easy editing</span></div></div>
    <div className="hero-visual">
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <div className="floating-card card-top"><span>Available for</span><strong>Product Design</strong><div className="status-dot" /></div>
      <div className="mock-portfolio"><div className="mock-nav"><span className="mock-logo">AM</span><span>Work</span><span>About</span></div><div className="mock-name"><p>Hi, I’m</p><h2>Alex Morgan<span>.</span></h2><p>Designer creating thoughtful digital experiences.</p></div><div className="mock-projects"><div><span>01</span><strong>Northstar</strong></div><div><span>02</span><strong>Field Notes</strong></div></div></div>
      <div className="floating-card card-bottom"><span>Portfolio saved</span><strong>Online & secure <Check size={16} /></strong></div>
    </div>
    <div className="how-it-works"><div><span>01</span><h3>Enter your details</h3><p>Share your background, skills, projects, and experience.</p></div><div><span>02</span><h3>Choose a style</h3><p>Select from three distinctly designed portfolio templates.</p></div><div><span>03</span><h3>Preview & publish</h3><p>Generate your portfolio and manage it from one place.</p></div></div>
  </section>
}

function TemplateView({ portfolio, selectedTemplate, onSelect, onContinue }) {
  return <section className="page-section"><div className="page-intro centered"><p className="eyebrow">Choose your look</p><h1>Three styles.<br /><em>One great portfolio.</em></h1><p>Each template has a completely different layout and visual personality.</p></div><div className="template-grid">{templates.map((template) => { const Icon = template.icon; const active = portfolio.template_id === template.id; return <button key={template.id} className={`template-card ${active ? 'active' : ''}`} onClick={() => onSelect(template.id)}><div className="template-preview" style={{ background: template.color }}><div className="preview-top"><span>{template.name}</span><i /></div><div className="preview-block large" /><div className="preview-block" /><div className="preview-block short" /><div className="preview-dots"><i /><i /><i /></div></div><div className="template-meta"><span className="template-icon"><Icon size={19} /></span><div><small>{template.eyebrow}</small><h3>{template.name}</h3><p>{template.description}</p></div><span className="select-check">{active ? <Check size={16} /> : <ArrowRight size={16} />}</span></div></button> })}</div><div className="page-actions"><button className="secondary-button" onClick={() => window.history.back()}><ChevronLeft size={17} /> Back</button><button className="primary-button" onClick={onContinue}>Preview portfolio <ArrowRight size={18} /></button></div><div className="selected-note"><Bookmark size={17} /> Selected template: <strong>{selectedTemplate}</strong></div></section>
}

function PreviewView({ portfolio, selectedTemplate, onEdit, onChoose, onSave, saving }) {
  return <section className="preview-page"><div className="preview-toolbar"><div><p className="eyebrow">Your generated portfolio</p><h1>{portfolio.full_name || 'Your portfolio'}</h1></div><div><button className="secondary-button" onClick={onChoose}><LayoutTemplate size={17} /> Change template</button><button className="secondary-button" onClick={onEdit}><Edit3 size={17} /> Edit details</button><button className="primary-button" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save portfolio'} <Save size={17} /></button></div></div><PortfolioPreview portfolio={portfolio} template={selectedTemplate.id} /></section>
}

function ManageView({ portfolio, user, onEdit, onSelectTemplate, onPreview, onDelete }) {
  return <section className="page-section manage-page"><div className="page-intro"><p className="eyebrow">Portfolio dashboard</p><h1>Manage your<br /><em>online presence.</em></h1><p>Review your saved profile, update the details, or remove it entirely.</p></div><div className="manage-grid"><div className="manage-card"><span className="manage-icon"><CircleUserRound size={27} /></span><p>Saved profile</p><h3>{portfolio.full_name || 'No portfolio yet'}</h3><span>{portfolio.email || 'Add your email to finish your profile'}</span><button className="primary-button" onClick={onPreview}>View portfolio <ArrowRight size={17} /></button></div><div className="manage-card"><span className="manage-icon lime"><LayoutTemplate size={27} /></span><p>Template selected</p><h3>{templates.find((item) => item.id === portfolio.template_id)?.name || 'Simple'}</h3><span>Choose another layout at any time.</span><button className="secondary-button" onClick={onSelectTemplate}>Change template</button></div><div className="manage-card"><span className="manage-icon coral"><Edit3 size={27} /></span><p>Portfolio actions</p><h3>{portfolio.full_name ? 'Everything is saved' : 'Start building'}</h3><span>{user ? 'Your cloud record is connected.' : 'Database connection is unavailable.'}</span><div className="manage-actions"><button className="secondary-button" onClick={onEdit}><Edit3 size={16} /> Edit</button><button className="danger-button" onClick={onDelete}><Trash2 size={16} /> Delete</button></div></div></div></section>
}

function PortfolioPreview({ portfolio, template }) {
  if (template === 'simple') return <SimpleTemplate portfolio={portfolio} />
  if (template === 'modern') return <ModernTemplate portfolio={portfolio} />
  return <CreativeTemplate portfolio={portfolio} />
}

function SimpleTemplate({ portfolio }) {
  const skills = (portfolio.skills || '').split('\n').filter(Boolean)
  return <article className="portfolio simple-template"><header className="simple-header"><div className="simple-avatar">{portfolio.profile_picture_url ? <img src={portfolio.profile_picture_url} alt="Profile" /> : <span>{(portfolio.full_name || 'P').slice(0, 1).toUpperCase()}</span>}</div><div><p>Portfolio / {new Date().getFullYear()}</p><h2>{portfolio.full_name || 'Your Name'}</h2><h3>{portfolio.email || 'your@email.com'}</h3></div><span className="simple-label">Creative developer</span></header><main><section className="simple-about"><p className="section-kicker">01 / About</p><h2>Designing with purpose.</h2><p>{portfolio.about || 'Add a short introduction to begin your portfolio.'}</p><div className="simple-contact"><span>{portfolio.phone || 'Contact number'}</span><span>{portfolio.address || 'Your location'}</span></div></section><section className="simple-work"><p className="section-kicker">02 / Selected work</p>{portfolio.projects.length ? portfolio.projects.map((project, index) => <article key={index}><span>0{index + 1}</span><div><h3>{project.title || 'Project title'}</h3><p>{project.description || 'Project summary.'}</p></div><ArrowRight size={20} /></article>) : <p className="empty-copy">Your projects will appear here.</p>}</section><section className="simple-skills"><p className="section-kicker">03 / Capabilities</p><div>{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : ['Add your skills']}</div></section></main><footer><span>{portfolio.full_name || 'Your Name'}</span><span>Designed with intention.</span></footer></article>
}

function ModernTemplate({ portfolio }) {
  const skills = (portfolio.skills || '').split('\n').filter(Boolean)
  return <article className="portfolio modern-template"><header className="modern-nav"><span className="modern-logo">{(portfolio.full_name || 'P').slice(0, 1)}</span><span>Portfolio</span><a href={`mailto:${portfolio.email}`}>Let’s talk</a></header><section className="modern-hero"><div><p className="section-kicker">Hello, I’m {portfolio.full_name || 'your name'}</p><h1>I build digital experiences that <em>feel alive.</em></h1><p>{portfolio.about || 'A short introduction will appear here.'}</p><div className="modern-actions"><a href={`mailto:${portfolio.email}`}>Work with me <ArrowRight size={17} /></a><span>{portfolio.address || 'Your location'}</span></div></div><div className="modern-portrait">{portfolio.profile_picture_url ? <img src={portfolio.profile_picture_url} alt="Profile" /> : <span>{(portfolio.full_name || 'P').slice(0, 1).toUpperCase()}</span>}</div></section><section className="modern-stats"><div><strong>{portfolio.projects.length || 0}</strong><span>Projects</span></div><div><strong>{portfolio.experience.length || 0}</strong><span>Roles</span></div><div><strong>∞</strong><span>Curiosity</span></div></section><section className="modern-section"><div className="modern-heading"><p className="section-kicker">Selected work</p><h2>What I’ve made.</h2></div><div className="modern-projects">{portfolio.projects.length ? portfolio.projects.map((project, index) => <article key={index}><span>0{index + 1}</span><div><h3>{project.title || 'Project title'}</h3><p>{project.description || 'Project summary.'}</p></div><i>↗</i></article>) : <p className="empty-copy">Your selected projects will appear here.</p>}</div></section><section className="modern-skills"><p className="section-kicker">Capabilities</p><div>{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : ['Your skill']}</div></section></article>
}

function CreativeTemplate({ portfolio }) {
  const skills = (portfolio.skills || '').split('\n').filter(Boolean)
  return <article className="portfolio creative-template"><header><div className="creative-stamp"><span>PORTFOLIO</span><i>✦</i></div><p>Independent creative<br />{portfolio.full_name || 'Your Name'}</p><a href={`mailto:${portfolio.email}`}>Say hello ↗</a></header><section className="creative-hero"><div className="creative-name"><p>Hi, I’m</p><h1>{portfolio.full_name || 'Your Name'}</h1><span className="creative-squiggle">✦</span></div><div className="creative-art">{portfolio.profile_picture_url ? <img src={portfolio.profile_picture_url} alt="Profile" /> : <span>{(portfolio.full_name || 'P').slice(0, 1).toUpperCase()}</span>}</div></section><section className="creative-about"><div><p className="section-kicker">A little about me</p><h2>Ideas with a <em>point of view.</em></h2></div><p>{portfolio.about || 'Your introduction will appear here.'}</p></section><section className="creative-bottom"><div><p className="section-kicker">Selected projects</p>{portfolio.projects.length ? portfolio.projects.map((project, index) => <article key={index}><span>0{index + 1}</span><h3>{project.title || 'Project title'}</h3><p>{project.description || 'Project summary.'}</p></article>) : <p className="empty-copy">Your projects will appear here.</p>}</div><div><p className="section-kicker">Skills</p><div className="creative-skills">{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : ['Your skill']}</div></div></section></article>
}

export default App
