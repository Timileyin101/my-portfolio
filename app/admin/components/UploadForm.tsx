import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Upload, X, Loader2, Link, Image, Video, CheckCircle, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';

// Type definitions
type ProjectType = 'graphics' | 'motion' | 'frontend';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  media: MediaItem[];
  liveLink?: string;
  tags: string[];
  createdAt: any;
  updatedAt?: any;
  userId?: string;
  userEmail?: string;
  status?: string;
  featured?: boolean;
  views: number;
  likes: number;
}

interface IFormInput {
  title: string;
  description: string;
  type: ProjectType;
  file?: FileList;
  liveLink?: string;
  tags?: string;
}

interface UploadFormProps {
  user: User;
  initialData?: Project | null;
  onFinish?: () => void;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

interface CloudinaryConfig {
  cloudName: string;
  preset: string;
}

interface CloudinaryResponse {
  secure_url: string;
  error?: {
    message: string;
  };
}

interface ProjectTypeOption {
  id: ProjectType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function UploadForm({ user, initialData, onFinish, showToast }: UploadFormProps): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { 
    register, 
    handleSubmit,
    setValue, 
    watch, 
    reset,
    formState: { errors } 
  } = useForm<IFormInput>({
    defaultValues: {
      type: initialData?.type || 'graphics',
      title: initialData?.title || '',
      description: initialData?.description || '',
      liveLink: initialData?.liveLink || '',
      tags: initialData?.tags?.join(', ') || ''
    }
  });

  useEffect(() => {
    if (initialData) {
      setValue('type', initialData.type);
      setValue('title', initialData.title);
      setValue('description', initialData.description);
      setValue('liveLink', initialData.liveLink || '');
      setValue('tags', initialData.tags?.join(', ') || '');
    }
  }, [initialData, setValue]);

  const selectedType: ProjectType = watch('type');

  const validateCloudinaryConfig = (): CloudinaryConfig => {
    const cloudName: string | undefined = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset: string | undefined = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;
    
    if (!cloudName || !preset) {
      throw new Error('Cloudinary configuration missing. Please check your environment variables.');
    }
    
    return { cloudName, preset };
  };

  const uploadToCloudinary = async (file: File, resourceType: 'image' | 'video'): Promise<string> => {
    const { cloudName, preset }: CloudinaryConfig = validateCloudinaryConfig();
    
    const formData: FormData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    
    const url: string = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const progressInterval: NodeJS.Timeout = setInterval(() => {
      setUploadProgress((prev: number) => Math.min(prev + 10, 90));
    }, 300);

    try {
      const response: Response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData: CloudinaryResponse = await response.json();
        throw new Error(errorData.error?.message || 'Upload to Cloudinary failed');
      }
      
      const data: CloudinaryResponse = await response.json();
      return data.secure_url;
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      throw error;
    }
  };

  const onSubmit: SubmitHandler<IFormInput> = async (data: IFormInput): Promise<void> => {
    if (!user) {
      showToast('error', 'Authentication required. Please sign in again.');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        showToast('error', 'User record not found. Please contact support.');
        return;
      }

      const userData: DocumentData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        showToast('error', 'Admin privileges required for upload.');
        return;
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      showToast('error', 'Failed to verify admin status.');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      let media: MediaItem[] = initialData?.media || [];

      // Handle new file uploads
      if (selectedFiles.length > 0) {
        showToast('warning', 'Uploading media...');

        const uploadedMedia: MediaItem[] = [];

        for (const file of selectedFiles) {
          const maxSize: number = selectedType === 'motion' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

          if (file.size > maxSize) {
            throw new Error(`File "${file.name}" exceeds the size limit`);
          }

          const resourceType: 'image' | 'video' = selectedType === 'motion' ? 'video' : 'image';
          const url: string = await uploadToCloudinary(file, resourceType);

          uploadedMedia.push({
            type: resourceType,
            url,
          });
        }

        media = uploadedMedia;
      } else if (!initialData) {
        throw new Error('Please select at least one file');
      }

      showToast('warning', initialData ? 'Updating project...' : 'Saving to database...');

      const tagsArray: string[] = data.tags
        ? data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

      const projectData: Partial<Project> & { 
        updatedAt: any;
        createdAt?: any;
        userId?: string;
        userEmail?: string;
        status?: string;
        featured?: boolean;
      } = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        type: data.type,
        media: media,
        liveLink: data.type === 'frontend' ? data.liveLink?.trim() : undefined,
        tags: tagsArray,
        updatedAt: serverTimestamp(),
        ...(initialData
          ? {}
          : {
              createdAt: serverTimestamp(),
              userId: user.uid,
              userEmail: user.email || 'unknown',
              status: 'published',
              featured: false,
              views: 0,
              likes: 0,
            }),
      };

      if (initialData) {
        await updateDoc(doc(db, 'projects', initialData.id), projectData);
        showToast('success', '✓ Project updated successfully!');
        onFinish?.();
      } else {
        await addDoc(collection(db, 'projects'), projectData);
        showToast('success', '✓ Project uploaded successfully!');
        reset();
        setSelectedFiles([]);
      }

      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload Error:', error);
      showToast('error', error.message || (initialData ? 'Update failed' : 'Upload failed'));
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const projectTypeOptions: ProjectTypeOption[] = [
    { id: 'graphics', label: 'Graphics', icon: Image },
    { id: 'motion', label: 'Motion', icon: Video },
    { id: 'frontend', label: 'Frontend', icon: Link },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      setSelectedFiles(files);
      setValue('file', e.target.files, { shouldValidate: true });
    }
  };

  const handleRemoveFiles = (): void => {
    setSelectedFiles([]);
    setValue('file', undefined, { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900/95 rounded-2xl shadow-2xl border border-zinc-800/50 p-8 sm:p-10 backdrop-blur-sm">
      
      <div className="mb-8 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start mb-3">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">
            {initialData ? 'Edit Project' : 'Upload Project'}
          </h2>
        </div>
        <p className="text-zinc-400">
          {initialData 
            ? 'Update your project details and media.' 
            : 'Add new content to your portfolio collection.'}
        </p>
      </div>

      {initialData && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-blue-400 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Editing: {initialData.title}
          </p>
        </div>
      )}

      <div className="space-y-7">
        
        {/* Project Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-3">Project Type</label>
          <div className="grid grid-cols-3 gap-3">
            {projectTypeOptions.map((type: ProjectTypeOption) => {
              const IconComponent = type.icon;
              return (
                <label
                  key={type.id}
                  className={`
                    relative flex flex-col items-center justify-center p-5 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${selectedType === type.id 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20 scale-105' 
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300'}
                  `}
                >
                  <input
                    type="radio"
                    value={type.id}
                    className="sr-only"
                    {...register('type')}
                  />
                  <IconComponent className="w-7 h-7 mb-2" />
                  <span className="text-sm font-semibold">{type.label}</span>
                  {selectedType === type.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Project Title */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Project Title <span className="text-red-400">*</span>
          </label>
          <input
            {...register('title', { 
              required: 'Title is required',
              minLength: { value: 3, message: 'Title must be at least 3 characters' },
              maxLength: { value: 100, message: 'Title must be less than 100 characters' }
            })}
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-zinc-800 
                      bg-black/50 text-white placeholder:text-zinc-600
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g. Nike Brand Campaign 2024"
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
              <X className="w-3 h-3" />
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Live Website URL (Frontend only) */}
        {selectedType === 'frontend' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Live Website URL <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Link className="absolute left-3.5 top-3.5 w-5 h-5 text-zinc-500" />
              <input
                {...register('liveLink', { 
                  required: selectedType === 'frontend' ? 'Live link is required for frontend projects' : false,
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: "Please enter a valid URL starting with http:// or https://"
                  }
                })}
                type="url"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-800 
                          bg-black/50 text-white placeholder:text-zinc-600
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="https://my-project.vercel.app"
              />
            </div>
            {errors.liveLink && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <X className="w-3 h-3" />
                {errors.liveLink.message}
              </p>
            )}
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            {selectedType === 'motion' ? 'Video Files' : 'Image Files'} 
            {initialData ? (
              <span className="text-zinc-500 font-normal text-xs ml-2">(Optional - leave empty to keep current)</span>
            ) : (
              <span className="text-red-400">*</span>
            )}
          </label>
          <p className="text-xs text-zinc-500 mb-3">You can upload multiple files</p>

          {/* Current Media Preview (Edit mode) */}
          {initialData && selectedFiles.length === 0 && (
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wide">
                Current Media ({initialData.media?.length || 0} file{initialData.media?.length !== 1 ? 's' : ''}):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {initialData.media?.map((mediaItem: MediaItem, idx: number) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden bg-zinc-900">
                    {mediaItem.type === 'video' ? (
                      <video 
                        src={mediaItem.url} 
                        className="w-full h-24 object-cover" 
                        muted
                      />
                    ) : (
                      <img 
                        src={mediaItem.url} 
                        alt={`Media ${idx + 1}`}
                        className="w-full h-24 object-cover" 
                      />
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-zinc-800 border-dashed rounded-xl hover:border-zinc-700 bg-black/30 hover:bg-zinc-900/50 transition-all duration-200 relative overflow-hidden group">
            
            {/* Upload Progress Bar */}
            {isLoading && uploadProgress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <div className="space-y-2 text-center">
              {selectedFiles.length > 0 ? (
                <div className="flex flex-col items-center gap-3 text-blue-400 relative">
                  <div className="relative">
                    <CheckCircle className="w-12 h-12 mx-auto" />
                    <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedFiles.map((f: File) => f.name).join(', ')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFiles}
                    className="mt-2 px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Remove All
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Upload className="mx-auto h-12 w-12 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                  </div>
                  <div className="flex text-sm text-zinc-400 justify-center">
                    <label className="relative cursor-pointer rounded-md font-semibold text-blue-400 hover:text-blue-300 focus-within:outline-none transition-colors">
                      <span>{initialData ? 'Replace media' : 'Choose files'}</span>
                      <input
                        type="file"
                        multiple
                        accept={selectedType === 'motion' ? 'video/*' : 'image/*'}
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-zinc-600">
                    {selectedType === 'motion' ? 'MP4, WebM up to 50MB each' : 'PNG, JPG, GIF up to 5MB each'}
                  </p>
                </>
              )}
            </div>
          </div>
          {errors.file && (
            <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
              <X className="w-3 h-3" />
              {errors.file.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Description <span className="text-zinc-500 font-normal text-xs">(Optional)</span>
          </label>
          <textarea
            {...register('description', {
              maxLength: { value: 500, message: 'Description must be less than 500 characters' }
            })}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-zinc-800 
                      bg-black/50 text-white placeholder:text-zinc-600
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="Describe the project goals, technologies used, or key features..."
          />
          {errors.description && (
            <p className="text-red-400 text-xs mt-1.5">{errors.description.message}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Tags <span className="text-zinc-500 font-normal text-xs">(Optional, comma-separated)</span>
          </label>
          <input
            {...register('tags')}
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-zinc-800 
                      bg-black/50 text-white placeholder:text-zinc-600
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="React, Animation, Branding, UX Design"
          />
          <p className="text-xs text-zinc-600 mt-1.5">Helps organize and filter your projects</p>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-500 transition-all duration-200 group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {uploadProgress > 0 && uploadProgress < 100 ? (
                <span>Uploading... {uploadProgress}%</span>
              ) : (
                <span>Processing...</span>
              )}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {initialData ? 'Update Project' : 'Upload Project'}
            </>
          )}
        </button>

        {/* Cancel Button (Edit mode only) */}
        {initialData && onFinish && (
          <button
            type="button"
            onClick={onFinish}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}