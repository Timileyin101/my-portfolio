'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { LogOut, LayoutDashboard, Loader2, ArrowLeft, AlertCircle, Shield, Grid, Trash2, ExternalLink, Eye, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import UploadForm from './components/UploadForm';

// ===========================
// TOAST NOTIFICATION SYSTEM
// ===========================
type ToastType = 'success' | 'error' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface UseToastReturn {
  showToast: (type: ToastType, message: string) => void;
  ToastContainer: () => ReactNode;
}

function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string): void => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const ToastContainer = useMemo(() => {
    return function ToastDisplay(){
      return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium border backdrop-blur-sm pointer-events-auto animate-in slide-in-from-right duration-300
                ${toast.type === 'success'
                  ? 'bg-blue-600/95 text-white border-blue-500 shadow-blue-500/20'
                  : toast.type === 'warning'
                  ? 'bg-yellow-600/95 text-white border-yellow-500 shadow-yellow-500/20'
                  : 'bg-red-600/95 text-white border-red-500 shadow-red-500/20'
                }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      );
    };
  }, [toasts]);

  return { showToast, ToastContainer };
}

// ===========================
// PROJECT INTERFACE
// ===========================
// CHANGE #1: Updated Project interface to support both new multi-file format (media array)
// and legacy single-file format (mediaUrl) for backward compatibility
interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  type: 'graphics' | 'motion' | 'frontend';
  media: MediaItem[]; // New format: array of media items
  mediaUrl?: string; // Legacy format: single media URL (kept for backward compatibility)
  liveLink?: string;
  tags: string[];
  createdAt: any;
  views: number;
  likes: number;
}

// ===========================
// PROJECT PREVIEW MODAL
// ===========================
// CHANGE #2: Complete rewrite of ProjectPreview to support gallery navigation
interface ProjectPreviewProps {
  project: Project;
  onClose: () => void;
  onDelete: (id: string, title: string) => void;
}

function ProjectPreview({ project, onClose, onDelete }: ProjectPreviewProps){
  // State to track which media item is currently being viewed
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  
  // CHANGE #3: Normalize media to always be an array, handling both new and legacy formats
  const mediaItems: MediaItem[] = useMemo(() => {
    // If project has the new media array format and it's not empty, use it
    if (project.media && Array.isArray(project.media) && project.media.length > 0) {
      return project.media;
    }
    // Legacy support: convert old mediaUrl to new format
    if (project.mediaUrl) {
      return [{
        type: project.type === 'motion' ? 'video' : 'image',
        url: project.mediaUrl
      }];
    }
    return [];
  }, [project]);

  const currentMedia = mediaItems[currentMediaIndex];
  const hasMultipleMedia = mediaItems.length > 1;

  // CHANGE #4: Navigation functions for gallery
  const goToNext = (): void => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const goToPrevious = (): void => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  // CHANGE #5: Keyboard navigation support for better UX
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' && hasMultipleMedia) {
        goToNext();
      } else if (e.key === 'ArrowLeft' && hasMultipleMedia) {
        goToPrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasMultipleMedia, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with media counter */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">{project.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-block px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-md uppercase tracking-wide">
                {project.type}
              </span>
              {/* CHANGE #6: Show current position in gallery */}
              {hasMultipleMedia && (
                <span className="text-xs text-zinc-500">
                  {currentMediaIndex + 1} / {mediaItems.length}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CHANGE #7: Media Content with Navigation Controls */}
        <div className="p-6 pt-8">
          <div className="relative">
            {/* Media Display - shows current media item */}
            {currentMedia && (
              <div className="relative bg-zinc-950 rounded-lg overflow-hidden">
                {currentMedia.type === 'video' ? (
                  <video
                    key={currentMedia.url} // Key forces re-render when media changes
                    src={currentMedia.url}
                    controls
                    className="w-full rounded-lg shadow-2xl"
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    key={currentMedia.url} // Key forces re-render when media changes
                    src={currentMedia.url}
                    alt={`${project.title} - Image ${currentMediaIndex + 1}`}
                    className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-2xl"
                  />
                )}

                {/* CHANGE #8: Navigation Arrows - only show if multiple media items */}
                {hasMultipleMedia && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
                      aria-label="Previous media"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
                      aria-label="Next media"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* CHANGE #9: Thumbnail Navigation Bar - only show if multiple media items */}
            {hasMultipleMedia && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {mediaItems.map((media, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentMediaIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentMediaIndex
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-zinc-700 hover:border-zinc-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-zinc-300 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Live Link */}
          {project.type === 'frontend' && project.liveLink && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Live Site</h3>
              <a
                href={project.liveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors hover:underline"
              >
                {project.liveLink}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Tags */}
          {project.tags?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-sm rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 flex items-center gap-6 text-sm text-zinc-400">
            <div>
              <span className="font-semibold text-white">{project.views || 0}</span> views
            </div>
            <div>
              <span className="font-semibold text-white">{project.likes || 0}</span> likes
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => onDelete(project.id, project.title)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
// PROJECT CARD COMPONENT
// ===========================
// CHANGE #10: Updated ProjectCard to show first media item and indicate multiple files
interface ProjectCardProps {
  project: Project;
  onPreview: (project: Project) => void;
  onDelete: (id: string, title: string) => void;
}

function ProjectCard({ project, onPreview, onDelete }: ProjectCardProps){
  // CHANGE #11: Get first media item for card preview, supporting both formats
  const firstMedia = useMemo((): MediaItem | null => {
    if (project.media && Array.isArray(project.media) && project.media.length > 0) {
      return project.media[0];
    }
    // Legacy support
    if (project.mediaUrl) {
      return {
        type: project.type === 'motion' ? 'video' : 'image',
        url: project.mediaUrl
      } as MediaItem;
    }
    return null;
  }, [project]);

  const hasMultipleMedia = project.media && Array.isArray(project.media) && project.media.length > 1;

  return (
    <div className="group bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 max-w-sm mx-auto">
      {/* Preview */}
      <div className="relative w-full overflow-hidden bg-zinc-950">
        {firstMedia && (
          firstMedia.type === 'video' ? (
            <video
              src={firstMedia.url}
              className="w-full h-auto object-contain"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={firstMedia.url}
              alt={project.title}
              className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
            />
          )
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={() => onPreview(project)}
            className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors"
            title="Preview"
          >
            <Eye className="w-5 h-5" />
          </button>
          {project.type === 'frontend' && project.liveLink && (
            <a
              href={project.liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors"
              title="Open live site"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => onDelete(project.id, project.title)}
            className="p-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-semibold rounded-md uppercase tracking-wide">
            {project.type}
          </span>
        </div>

        {/* CHANGE #12: Multiple Media Indicator Badge */}
        {hasMultipleMedia && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-md flex items-center gap-1">
              <Grid className="w-3 h-3" />
              {project.media.length}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1 line-clamp-1">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-md"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-md">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
          <span>{project.views || 0} views</span>
          <span>{project.likes || 0} likes</span>
        </div>
      </div>
    </div>
  );
}

// ===========================
// MAIN ADMIN COMPONENT
// ===========================
// NOTE: Main component unchanged - all modifications were in child components
export default function AdminPage(){
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'projects'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState<boolean>(false);

  const { showToast, ToastContainer } = useToast();

  // Authentication Effect
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      try {
        if (!currentUser) {
          setUser(null);
          setIsAdmin(false);
          setCheckingAuth(false);
          router.push('/admin/login');
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!isMounted) return;

        if (!userDoc.exists()) {
          console.error('Firestore document not found for UID:', currentUser.uid);
          showToast('error', 'User record not found. Please contact support.');
          setIsAdmin(false);
          setUser(null);
          setCheckingAuth(false);
          await signOut(auth);
          router.push('/admin/login');
          return;
        }

        const userData = userDoc.data();

        if (userData?.role === 'admin') {
          setIsAdmin(true);
          setUser(currentUser);
          
          if (!hasShownWelcome) {
            showToast('success', '✓ Admin access granted');
            setHasShownWelcome(true);
          }
        } else {
          showToast('error', 'Access denied: Admin privileges required');
          setIsAdmin(false);
          setUser(null);
          await signOut(auth);
          setTimeout(() => router.push('/admin/login'), 2000);
        }

        setCheckingAuth(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error checking admin status:', error);
        showToast('error', 'Failed to verify admin status');
        setIsAdmin(false);
        setUser(null);
        setCheckingAuth(false);
        router.push('/admin/login');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router, showToast, hasShownWelcome]);
  // Load Projects Effect
  useEffect(() => {
    if (!isAdmin || !user) return;

    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        
        setProjects(projectsData);
        setLoadingProjects(false);
      },
      (error) => {
        console.error('Error fetching projects:', error);
        showToast('error', 'Failed to load projects');
        setLoadingProjects(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, user, showToast]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
      showToast('success', 'Signed out successfully');
      router.push('/admin/login');
    } catch (error) {
      showToast('error', 'Sign-out failed');
      console.error(error);
    }
  }, [router, showToast]);

  const handleDeleteProject = useCallback(async (projectId: string, projectTitle: string): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      showToast('success', 'Project deleted successfully');
      setPreviewProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('error', 'Failed to delete project');
    }
  }, [showToast]);

  if (checkingAuth || user === undefined) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-blue-950/30 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse"></div>
          </div>
          <p className="text-zinc-400 text-sm font-medium animate-pulse">
            Verifying admin access...
          </p>
        </div>
        <ToastContainer />
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950/20 flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md text-center backdrop-blur-sm animate-in zoom-in-95 duration-300">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400 mb-6">
              You don't have admin privileges to access this dashboard.
            </p>
            <button
              onClick={() => router.push('/admin/login')}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-blue-950/20 text-white selection:bg-blue-500/30 relative overflow-hidden">
        
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[10%] right-[15%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[15%] left-[10%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
          <div className="absolute top-[30%] right-[40%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }}></div>
          <div className="absolute bottom-[30%] right-[25%] w-[350px] h-[350px] bg-blue-700/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        </div>

        <nav className="border-b border-zinc-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-2 shadow-lg shadow-blue-500/20">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight leading-none">
                    Admin<span className="text-blue-400">Dashboard</span>
                  </span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-3 h-3" />
                    {projects.length} Project{projects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/"
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-all px-4 py-2 rounded-lg hover:bg-zinc-800/50 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Return to Site</span>
                </a>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-red-400 transition-all px-4 py-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="border-b border-zinc-800/50 bg-black/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all relative ${
                  activeTab === 'projects' ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
                All Projects
                {activeTab === 'projects' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all relative ${
                  activeTab === 'upload' ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                Upload New
                {activeTab === 'upload' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-10">
              <div className="text-center sm:text-left">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                  Create New{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">
                    Project
                  </span>
                </h1>
                <p className="text-zinc-400 max-w-2xl text-lg mt-3 leading-relaxed">
                  Upload your designs, motion graphics, or web deployments to showcase your work.
                </p>
              </div>

              <div className="flex justify-center">
                <UploadForm user={user} showToast={showToast} />
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    Your Projects
                  </h1>
                  <p className="text-zinc-400 mt-2">
                    Manage and preview all uploaded content
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>

              {loadingProjects ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                  <Grid className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-300 mb-2">No projects yet</h3>
                  <p className="text-zinc-500 mb-6">Start by uploading your first project</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Upload Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPreview={setPreviewProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {previewProject && (
        <ProjectPreview
          project={previewProject}
          onClose={() => setPreviewProject(null)}
          onDelete={handleDeleteProject}
        />
      )}
      
      <ToastContainer />
    </>
  );
}