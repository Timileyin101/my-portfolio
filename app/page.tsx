/* 
  PortfolioPage.jsx - Complete Version with Gallery Navigation
  - Multi-file gallery support with Next/Previous navigation
  - Tabbed "All Projects" modal with categorized view
  - First media preview on project cards
  - Full backward compatibility with legacy single-file format
*/

"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, Moon, Sun, Monitor, PenTool, 
  Code, Send, ArrowRight, Instagram, Linkedin, 
  Twitter, Github, Briefcase, Layers, Video, Image, Globe, CheckCircle, 
  Plus, XCircle, Trash2, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { motion } from "framer-motion";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import emailjs from "@emailjs/browser";

export default function PortfolioPage() {
  const [dark, setDark] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showAllProjectsModal, setShowAllProjectsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchProjectsFromFirebase();
  }, []);

  const fetchProjectsFromFirebase = async () => {
    try {
      setLoadingProjects(true);
      const projectsRef = collection(db, 'projects');
      const querySnapshot = await getDocs(projectsRef);
      const fetchedProjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const skills = ['Figma', 'After Effects', 'Photoshop', 'Illustrator', 'React', 'Next.js', 'Tailwind'];
  const services = [
    { title: 'Graphic Design', desc: 'Branding, print, visual identity, UI assets' },
    { title: 'Motion Graphics', desc: 'Short form motion, promos, logo animation' },
    { title: 'Frontend Development', desc: 'High-fidelity implementations with React/Next' },
  ];
  const testimonials = [
    { id: 1, name: 'Samuel Adeyemi D., Creative Director, POD Media', quote: 'Working with Timi was a game-changer for our brand. The logo and visual identity perfectly captured our vision. Professional, creative, and fast!"' },
    { id: 2, name: 'Lekan A., Product Lead, TechHive', quote: 'Exceptionally reliable and highly skilled — I would confidently recommend him to anyone.' },
  ];

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function submitContact(e) {
    e.preventDefault();
    if (submitStatus === "sending") return;
    setSubmitStatus("sending");
    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_CLIENT_TO_ME,
        { from_name: form.name, from_email: form.email, message: form.message },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      );
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_AUTO_REPLY,
        { to_name: form.name, to_email: form.email },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
      );
      setSubmitStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      console.error("EmailJS error:", err?.text || err);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    }
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

      const staggerContainer = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.1,
        },
      },
    };

    const fadeUp = {
      hidden: {
        opacity: 0,
        y: 12,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut",
        },
      },
    };
    const stagger = {
      visible: {
        transition: {
          staggerChildren: 0.12
        }
      }
    };

    const fadeLeft = {
      hidden: { opacity: 0, x: -24 },
      visible: { opacity: 1, x: 0 }
    };

  // PROJECT PREVIEW MODAL WITH GALLERY
  const ProjectPreviewModal = ({ project, onClose }) => {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const mediaItems = useMemo(() => {
      if (project.media && Array.isArray(project.media) && project.media.length > 0) return project.media;
      if (project.mediaUrl) return [{ type: project.type === 'motion' ? 'video' : 'image', url: project.mediaUrl }];
      return [];
    }, [project]);
    const currentMedia = mediaItems[currentMediaIndex];
    const hasMultipleMedia = mediaItems.length > 1;
    const goToNext = () => setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
    const goToPrevious = () => setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    useEffect(() => {
      const handleKeyPress = (e) => {
        if (e.key === 'ArrowRight' && hasMultipleMedia) goToNext();
        else if (e.key === 'ArrowLeft' && hasMultipleMedia) goToPrevious();
        else if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [hasMultipleMedia, onClose]);
    if (!project) return null;
    return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
    <div className="relative w-2x1 max-w-2xl max-h-[95vh] overflow-auto bg-slate-900 rounded-2xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
      
      {/* Header Section */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-6 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{project.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-block px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-md uppercase">{project.type}</span>
              {hasMultipleMedia && <span className="text-xs text-gray-400">{currentMediaIndex + 1} / {mediaItems.length}</span>}
            </div>
            
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Media Display */}
        <div className="relative">
          {currentMedia && (
            <div>
              {currentMedia.type === 'video' ? (
                <video 
                  key={currentMedia.url} 
                  src={currentMedia.url} 
                  controls 
                  className="w-full max-h-[70vh] mx-auto" 
                  style={{ objectFit: 'contain' }} 
                  autoPlay 
                  playsInline 
                />
              ) : (
                <img 
                  key={currentMedia.url} 
                  src={currentMedia.url} 
                  alt={`${project.title} - Image ${currentMediaIndex + 1}`} 
                  className="w-full max-h-[70vh] mx-auto" 
                  style={{ objectFit: 'contain' }} 
                />
              )}
              {hasMultipleMedia && (
                <>
                  <button 
                    onClick={goToPrevious} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button 
                    onClick={goToNext} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Thumbnail Gallery */}
          {hasMultipleMedia && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {mediaItems.map((media, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentMediaIndex(idx)} 
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentMediaIndex 
                      ? 'border-blue-500 ring-2 ring-blue-500/50' 
                      : 'border-slate-700 hover:border-slate-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  {media.type === 'video' ? (
                    <video src={media.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={media.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        {project.type === 'frontend' && project.liveLink && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Live Site</h3>
            <a 
              href={project.liveLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors hover:underline"
            >
              {project.liveLink}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {project.description && (
              <div className="mt-4">
                <p className="text-gray-300 leading-relaxed">{project.description}</p>
              </div>
            )}

        {project.tags && project.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-slate-800 text-gray-300 text-sm rounded-lg">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* <div className="mt-6 flex items-center gap-6 text-sm text-gray-400"><div><span className="font-semibold text-white">{project.views || 0}</span> views</div><div><span className="font-semibold text-white">{project.likes || 0}</span> likes</div></div> */}
      </div>
    </div>
  </div>
);
  };

  // ALL PROJECTS MODAL
  const AllProjectsModal = ({ onClose, onSelectProject }) => {
    const [activeTab, setActiveTab] = useState('graphics');
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }, []);
    const tabs = [
      { id: 'graphics', label: 'Graphics', icon: Image },
      { id: 'motion', label: 'Motion', icon: Video },
      { id: 'frontend', label: 'Frontend', icon: Globe },
    ];
    const filteredProjects = projects.filter(project => project.type === activeTab);
    const getFirstMedia = (project) => {
      if (project.media && Array.isArray(project.media) && project.media.length > 0) return project.media[0];
      if (project.mediaUrl) return { type: project.type === 'motion' ? 'video' : 'image', url: project.mediaUrl };
      return null;
    };
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-2" onClick={onClose}>
        <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
            <div><h2 className="text-2xl font-bold text-white">All Projects</h2><p className="text-sm text-gray-400 mt-1">{filteredProjects.length} {activeTab} project{filteredProjects.length !== 1 ? 's' : ''}</p></div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition"><X size={24} className="text-white" /></button>
          </div>
          <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0">
            <div className="flex px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = projects.filter(p => p.type === tab.id).length;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all ${isActive ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
                    <Icon size={18} /><span>{tab.label}</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-gray-500'}`}>{count}</span>
                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {loadingProjects ? (
                <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-gray-400">Loading projects...</p></div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12"><div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><Layers className="w-8 h-8 text-gray-500" /></div><h3 className="text-lg font-semibold text-gray-300 mb-2">No {activeTab} projects yet</h3><p className="text-gray-500">Check back soon for new {activeTab} work</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProjects.map((project) => {
                    const firstMedia = getFirstMedia(project);
                    const hasMultipleMedia = project.media && Array.isArray(project.media) && project.media.length > 1;
                    return (
                      <article key={project.id} className="bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group shadow-lg hover:shadow-blue-500/20" onClick={() => { onSelectProject(project); onClose(); }}>
                        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                          {firstMedia && (firstMedia.type === 'video' ? <video src={firstMedia.url} className="w-full h-full" style={{ objectFit: 'contain' }} muted /> : <img src={firstMedia.url} alt={project.title} className="w-full h-full group-hover:scale-105 transition-transform duration-300" style={{ objectFit: 'contain' }} />)}
                          {hasMultipleMedia && <div className="absolute top-3 right-3"><span className="px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-md flex items-center gap-1"><Layers className="w-3 h-3" />{project.media.length}</span></div>}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3"><span className="flex items-center gap-2 text-white font-medium px-4 py-2 bg-blue-600 rounded-lg"><Eye size={18} />View Project</span></div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1"><h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">{project.title}</h3><p className="text-blue-400 text-sm uppercase tracking-wide mt-1 flex items-center gap-2">{project.type}{project.type === 'frontend' && project.liveLink && <Globe size={14} />}</p></div>
                            <ArrowRight className="text-blue-500 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" size={20} />
                          </div>
                          <p className="mt-3 text-gray-300 text-sm leading-relaxed line-clamp-2">{project.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

          return (
            <div className={dark ? 'bg-black text-white min-h-screen' : 'bg-white text-slate-900 min-h-screen'}>
              <div className="max-w-6xl mx-auto px-6 py-10">
                <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex items-center justify-between py-4"
        >
          {/* Left: Logo + Name */}
          <div className="flex items-center gap-3">
            <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          whileHover={{ scale: 0.7 }}
          className="w-4 h-12 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg cursor-pointer"
        >
        </motion.div>

            <div>
              <motion.h1
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-lg font-semibold"
              >
                Timileyin O.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-sm opacity-70"
              >
                Graphic & Motion Designer — Frontend Dev
              </motion.p>
            </div>
          </div>

          {/* Right: Nav + CTA */}
          <div className="flex items-center gap-4">
            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.08 }
                }
              }}
              className="hidden md:flex gap-6 text-sm opacity-85"
            >
              {["About", "Services", "Projects", "Contact"].map((item, i) => (
                <motion.a
                  key={i}
                  href={`#${item.toLowerCase()}`}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="hover:text-blue-600 transition-colors duration-300"
                >
                  {item}
                </motion.a>
              ))}
            </motion.nav>

            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Hire me
            </motion.a>
          </div>
        </motion.header>

                <motion.section
          id="hero"
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
        >
          {/* LEFT */}
          <div>
            <motion.p
              variants={fadeUp}
              className="text-sm uppercase tracking-wide text-blue-400"
            >
              Hi — I'm
            </motion.p>

            <motion.h2
              variants={fadeUp}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-4xl md:text-5xl font-extrabold leading-tight mt-2"
            >
              Timileyin — a Creative Technologist
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl opacity-80"
            >
              I blend design, motion, and frontend engineering to create product experiences
              that are clear, engaging, and purposeful — from visual identity to interaction
              and performance.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex gap-4"
            >
              <motion.a
                href="#projects"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block bg-blue-600 text-white px-5 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                See my work
              </motion.a>

              <motion.a
                href="#contact"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block border border-slate-600 px-5 py-3 rounded-md hover:border-blue-500 transition-colors"
              >
                Get in touch
              </motion.a>
            </motion.div>

            {/* Skills */}
            <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-8 flex gap-3 items-center flex-wrap"
          >
            {skills.map((skill) => (
              <motion.span
                key={skill}
                variants={fadeUp}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="px-3 py-1 rounded-full border border-slate-700 text-sm opacity-90 cursor-default"
              >
                {skill}
              </motion.span>
            ))}
          </motion.div>

          </div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="order-first md:order-last flex justify-center md:justify-end"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-[300px] h-[300px] md:w-[340px] md:h-[410px] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"
            >
              <motion.img
                src="/Profile 2.png"
                alt="me"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg w-[300px] h-[380px] object-cover shadow-lg filter grayscale hover:grayscale-0 transition-all duration-300"
              />
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mt-20"
      >
        <motion.h3
          variants={fadeLeft}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
        >
          About me
        </motion.h3>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Image */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 1 }}
            className="md:col-span-1"
          >
            <motion.img
              src="/About2.png"
              alt="me"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 1 }}
              className="rounded-lg w-full object-cover shadow-lg transition-all duration-300"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-2"
          >
            <p className="opacity-85 leading-relaxed">
              With over 4 years of practical experience in the creative and tech space,
              I specialize in designing impactful brand identities, creating engaging
              motion graphics, and building responsive, user-focused front-end interfaces.
              My work is driven by a deep commitment to clarity, clean visual language,
              and purposeful animation—ensuring that every project not only looks visually
              compelling but also communicates meaningfully and converts effectively.
              I understand the importance of aligning design with strategy, and I take
              pride in delivering solutions that help brands stand out, connect emotionally
              with their audience, and achieve their goals across both digital and visual
              platforms.
            </p>
          </motion.div>
        </div>
      </motion.section>

        <motion.section
        id="services"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mt-20 scroll-mt-20"
      >
        <motion.h3
          variants={fadeLeft}
          transition={{ duration: 0.7 }}
          className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
        >
          Services
        </motion.h3>

        <motion.div
          variants={{
            visible: {
              transition: { staggerChildren: 0.12 }
            }
          }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {services.map((s) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className={`p-6 rounded-2xl border ${
                dark
                  ? "border-slate-800 bg-slate-900/50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="w-10 h-10 mb-4 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                {s.title.includes("Motion") ? (
                  <Monitor size={20} />
                ) : s.title.includes("Graphic") ? (
                  <PenTool size={20} />
                ) : (
                  <Code size={20} />
                )}
              </div>

              <h4 className="font-semibold text-lg">{s.title}</h4>
              <p className="mt-2 opacity-80 text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

        <motion.section
        id="projects"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mt-20"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.h3
            variants={fadeUp}
            className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
          >
            Recent Work
          </motion.h3>

          <motion.button
            onClick={() => setShowAllProjectsModal(true)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="text-sm opacity-80 hover:text-blue-500 hover:underline transition-colors flex items-center gap-2"
          >
            View all projects <ArrowRight size={16} />
          </motion.button>
        </div>

        {/* Loading */}
        {loadingProjects ? (
          <div className="mt-6 text-center py-12">
            <p className="opacity-70">Loading projects...</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.slice(0, 6).map((project) => {
              const firstMedia =
                project.media && Array.isArray(project.media) && project.media.length > 0
                  ? project.media[0]
                  : project.mediaUrl
                  ? {
                      type: project.type === "motion" ? "video" : "image",
                      url: project.mediaUrl,
                    }
                  : null;

              const hasMultipleMedia =
                project.media && Array.isArray(project.media) && project.media.length > 1;

              return (
                <motion.article
                  key={project.id}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-lg overflow-hidden group bg-slate-900/40 border border-slate-800 cursor-pointer relative"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Media */}
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {firstMedia &&
                      (firstMedia.type === "video" ? (
                        <video
                          src={firstMedia.url}
                          muted
                          playsInline
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <img
                          src={firstMedia.url}
                          alt={project.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      ))}

                    {/* Media count badge */}
                    {hasMultipleMedia && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {project.media.length}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  {/* Meta */}
                  <div className="p-4">
                    <h4 className="font-semibold">{project.title}</h4>
                    <p className="text-sm opacity-80 mt-1">{project.type}</p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </motion.section>


        <motion.section
        id="testimonials"
        className="mt-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h3
          className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
          variants={fadeUp}
        >
          Testimonials
        </motion.h3>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <motion.blockquote
              key={t.id}
              className="p-6 rounded-xl border border-slate-700"
              variants={fadeUp}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 120 }}
            >
              <p className="italic">"{t.quote}"</p>
              <footer className="mt-3 text-sm font-semibold">— {t.name}</footer>
            </motion.blockquote>
          ))}
        </div>
      </motion.section>

        <motion.section
        id="blog"
        className="mt-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h3
          className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
          variants={fadeUp}
        >
          Blog
        </motion.h3>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            "How I approach motion design",
            "Design systems for solo creators",
            "Animation tips for web",
          ].map((title, idx) => (
            <motion.article
              key={idx}
              className="p-4 rounded-lg border border-slate-700"
              variants={fadeUp}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 120 }}
            >
              <h5 className="font-semibold">{title}</h5>
              <p className="mt-2 text-sm opacity-80 italic">
                Exciting insights loading... stay tuned!
              </p>
            </motion.article>
          ))}
        </div>
      </motion.section>

        <motion.section
        id="contact"
        className="mt-20 mb-12 scroll-mt-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h3
          className="text-2xl font-bold border-l-4 border-blue-500 pl-4"
          variants={fadeUp}
        >
          Contact
        </motion.h3>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Form */}
          <motion.div
            className={`p-8 md:p-12 rounded-2xl shadow-2xl ${dark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100"}`}
            variants={fadeUp}
          >
            {submitStatus === "success" ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                <p className="opacity-70">I'll get back to you as soon as possible.</p>
                <button onClick={() => setSubmitStatus('idle')} className="mt-6 text-blue-500 underline">
                  Send another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={submitContact} className="space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInput}
                  placeholder="Your name"
                  className={`w-full p-3 rounded-md border ${dark ? 'border-slate-700 bg-black/30' : 'border-slate-200 bg-slate-50'} focus:border-blue-500 outline-none transition-colors`}
                  required
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInput}
                  placeholder="Your email"
                  className={`w-full p-3 rounded-md border ${dark ? 'border-slate-700 bg-black/30' : 'border-slate-200 bg-slate-50'} focus:border-blue-500 outline-none transition-colors`}
                  required
                />
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleInput}
                  placeholder="Message"
                  rows={6}
                  className={`w-full p-3 rounded-md border ${dark ? 'border-slate-700 bg-black/30' : 'border-slate-200 bg-slate-50'} focus:border-blue-500 outline-none transition-colors`}
                  required
                />
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <button
                    type="submit"
                    className="w-full md:w-1/2 bg-blue-600 text-white px-5 py-3 rounded-md font-medium hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={submitStatus === "sending"}
                  >
                    {submitStatus === "sending" ? "Sending..." : <><Send size={16} /> Send Message</>}
                  </button>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-1/2 bg-green-500 text-white px-5 py-3 rounded-md font-medium hover:bg-green-600 flex justify-center items-center gap-2"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </form>
            )}
          </motion.div>

          {/* Contact Info / Status */}
          <motion.div
            className={`p-8 rounded-2xl border ${dark ? "border-slate-800 bg-gray-900/50" : "border-slate-200 bg-white"}`}
            variants={fadeUp}
          >
            <h4 className="font-semibold text-xl">Let's work together</h4>
            <p className="mt-4 opacity-80 leading-relaxed">
              Have a project in mind? Looking for a long-term partner? I am currently open for new opportunities.
            </p>
            <div className="mt-8 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider opacity-50 block mb-1">Email</span>
                <a href="mailto:olatunjit593@gmail.com" className="text-lg hover:text-blue-500 transition-colors">
                  olatunjit593@gmail.com
                </a>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider opacity-50 block mb-1">Status</span>
                <div className="flex items-center gap-2 text-green-500">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Available for work
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

        <footer className={`py-12 border-t ${dark ? 'bg-black border-gray-900' : 'bg-gray-50 border-gray-200'}`}>
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="text-center md:text-left flex items-center gap-2">
        <img src="/OTC Logo.png" alt="OTC Logo" className="w-20 h-20 object-contain mb-2" />
        <h4 className="text-2xl font-bold tracking-tighter mb-2 -ml-6">
          <span className={dark ? 'text-white' : 'text-black'}>O.T Crea8ives</span>
        </h4>
        <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          © {new Date().getFullYear()} Portfolio. All Rights Reserved.
        </p>
      </div>

      <div className="flex gap-6">
        <a href="https://www.instagram.com/ot.cre8ives/?hl=en" target="_blank" rel="noopener noreferrer" className={`hover:text-blue-500 transition-colors ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Instagram size={24} />
        </a>
        <a href="https://x.com/OTimileyin70286" target="_blank" rel="noopener noreferrer" className={`hover:text-blue-500 transition-colors ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Twitter size={24} />
        </a>
        <a href="https://www.linkedin.com/in/timileyin-olatunji-6a3abb317" target="_blank" rel="noopener noreferrer" className={`hover:text-blue-500 transition-colors ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Linkedin size={24} />
        </a>
        <a href="https://github.com/Timileyin101" target="_blank" rel="noopener noreferrer" className={`hover:text-blue-500 transition-colors ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          <Github size={24} />
        </a>
      </div>
    </div>
  </footer>

      </div>
      {showAllProjectsModal && <AllProjectsModal onClose={() => setShowAllProjectsModal(false)} onSelectProject={setSelectedProject} />}
      {selectedProject && <ProjectPreviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}