"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { movieApi } from "@/lib/api";
import { MovieDetails } from "@/types";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useWatchedStore } from "@/stores/watchedStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "react-hot-toast";
import RatingModal from "@/components/ui/RatingModal";
import {
  getImageUrl,
  formatRating,
  formatRuntime,
  getYearFromDate,
} from "@/lib/utils";
import {
  Calendar,
  Clock,
  Star,
  Play,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkCheck,
  Share,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function MovieDetailPage() {
  const params = useParams();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [watched, setWatched] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [watchedLoading, setWatchedLoading] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { addBookmark, removeBookmark, isBookmarked, checkBookmarkStatus } =
    useBookmarkStore();
  const { addWatchedMovie, removeWatchedMovie, isWatched, checkWatchedStatus } =
    useWatchedStore();

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await movieApi.getDetails(movieId);
        setMovie(response.data.data);

        // Check bookmark and watched status if authenticated
        if (isAuthenticated) {
          try {
            const [bookmarkStatus, watchedStatus] = await Promise.all([
              checkBookmarkStatus(parseInt(movieId)),
              checkWatchedStatus(parseInt(movieId)),
            ]);
            setBookmarked(bookmarkStatus);
            setWatched(watchedStatus);
          } catch (statusError) {
            // Fallback to store state
            setBookmarked(isBookmarked(parseInt(movieId)));
            setWatched(isWatched(parseInt(movieId)));
          }
        }
      } catch (err) {
        console.error("Error fetching movie details:", err);
        setError("Failed to load movie details");
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovieDetails();
    }
  }, [
    movieId,
    isAuthenticated,
    checkBookmarkStatus,
    checkWatchedStatus,
    isBookmarked,
    isWatched,
  ]);

  const handleBookmarkToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to bookmark movies");
      return;
    }

    if (!movie) return;

    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(movie.id);
        setBookmarked(false);
        toast.success("Removed from bookmarks");
      } else {
        await addBookmark(movie.id, movie.title, movie.poster_path || "");
        setBookmarked(true);
        toast.success("Added to bookmarks");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleWatchedToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to mark movies as watched");
      return;
    }

    if (!movie) return;

    if (watched) {
      setWatchedLoading(true);
      try {
        await removeWatchedMovie(movie.id);
        setWatched(false);
        toast.success("Removed from watched list");
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } finally {
        setWatchedLoading(false);
      }
    } else {
      // Show rating modal instead of directly adding
      setShowRatingModal(true);
    }
  };

  const handleRatingSubmit = async (rating: number, review?: string) => {
    if (!movie) return;

    try {
      await addWatchedMovie(
        movie.id,
        movie.title,
        movie.poster_path || "",
        rating,
        review
      );
      setWatched(true);
      setShowRatingModal(false);

      if (rating > 0) {
        toast.success(`Marked as watched with ${rating}/10 rating!`);
      } else {
        toast.success("Marked as watched!");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
      throw error;
    }
  };

  const handleShare = async () => {
    if (!movie) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: movie.title,
          text: movie.overview,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleWatchTrailer = () => {
    if (movie?.videos?.results && movie.videos.results.length > 0) {
      const trailer =
        movie.videos.results.find(
          (video) => video.type === "Trailer" && video.site === "YouTube"
        ) || movie.videos.results[0];

      if (trailer) {
        window.open(`https://www.youtube.com/watch?v=${trailer.key}`, "_blank");
      } else {
        toast("No trailer available for this movie");
      }
    } else {
      toast("No trailer available for this movie");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Movie not found"}</p>
          <Link
            href="/movies"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Fixed spacing for header */}
      <div className="pt-20">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/movies"
            className="inline-flex items-center text-gray-400 hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Movies
          </Link>
        </div>

        {/* Hero Section with Backdrop */}
        <div className="relative h-96 md:h-[500px] overflow-hidden">
          {movie.backdrop_path && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getImageUrl(
                  movie.backdrop_path,
                  "w1280"
                )})`,
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-70"></div>
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8 w-full">
              {/* Movie Poster */}
              <div className="flex-shrink-0 relative">
                <img
                  src={getImageUrl(movie.poster_path, "w500")}
                  alt={movie.title}
                  className="w-48 md:w-64 rounded-lg shadow-2xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getImageUrl(null);
                  }}
                />

                {/* Status Badges on Poster */}
                {isAuthenticated && (
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {bookmarked && (
                      <div className="bg-yellow-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                        <Bookmark className="h-3 w-3 mr-1" />
                        Saved
                      </div>
                    )}
                    {watched && (
                      <div className="bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        Watched
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Movie Info */}
              <div className="flex-1 text-white">
                <h1 className="text-3xl md:text-5xl font-bold mb-2">
                  {movie.title}
                </h1>
                {movie.tagline && (
                  <p className="text-lg md:text-xl text-gray-300 mb-4 italic">
                    &quot;{movie.tagline}&quot;
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 mr-1" />
                    <span className="text-lg font-semibold">
                      {formatRating(movie.vote_average)}
                    </span>
                    <span className="text-gray-300 ml-1">
                      ({movie.vote_count.toLocaleString()} votes)
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-300 mr-1" />
                    <span>{getYearFromDate(movie.release_date)}</span>
                  </div>

                  {movie.runtime && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-300 mr-1" />
                      <span>{formatRuntime(movie.runtime)}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-purple-600 bg-opacity-80 rounded-full text-sm font-medium"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleWatchTrailer}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Watch Trailer
                  </button>

                  {isAuthenticated && (
                    <>
                      <button
                        onClick={handleBookmarkToggle}
                        disabled={bookmarkLoading}
                        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          bookmarked
                            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                            : "bg-gray-800 bg-opacity-80 hover:bg-opacity-100 text-white"
                        } ${
                          bookmarkLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {bookmarkLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                        ) : bookmarked ? (
                          <BookmarkCheck className="h-5 w-5 mr-2" />
                        ) : (
                          <Bookmark className="h-5 w-5 mr-2" />
                        )}
                        {bookmarked ? "Bookmarked" : "Add to Watchlist"}
                      </button>

                      <button
                        onClick={handleWatchedToggle}
                        disabled={watchedLoading}
                        className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          watched
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-800 bg-opacity-80 hover:bg-opacity-100 text-white"
                        } ${
                          watchedLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {watchedLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                        ) : watched ? (
                          <Eye className="h-5 w-5 mr-2" />
                        ) : (
                          <EyeOff className="h-5 w-5 mr-2" />
                        )}
                        {watched ? "Watched" : "Mark as Watched"}
                      </button>
                    </>
                  )}
                  <RatingModal
                    isOpen={showRatingModal}
                    onClose={() => setShowRatingModal(false)}
                    onSubmit={handleRatingSubmit}
                    movieTitle={movie.title}
                    moviePoster={movie.poster_path || ""}
                    isLoading={watchedLoading}
                  />
                  <button
                    onClick={handleShare}
                    className="flex items-center px-4 py-3 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 rounded-lg font-medium transition-colors text-white"
                  >
                    <Share className="h-5 w-5" />
                    <span className="sr-only">Share movie</span>
                  </button>
                </div>

                {/* Login prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500/50 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      <Link
                        href="/login"
                        className="text-blue-300 hover:text-blue-100 underline"
                      >
                        Login
                      </Link>{" "}
                      to bookmark movies and track your watching progress
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {movie.overview || "No overview available for this movie."}
                </p>
              </section>

              {/* Cast */}
              {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Cast</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {movie.credits.cast.slice(0, 8).map((actor) => (
                      <div key={actor.id} className="text-center">
                        <div className="aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden mb-2">
                          {actor.profile_path ? (
                            <img
                              src={getImageUrl(actor.profile_path, "w185")}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-xs">No Photo</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-white text-sm">
                          {actor.name}
                        </h3>
                        <p className="text-gray-400 text-xs">
                          {actor.character}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Similar Movies */}
              {movie.similar?.results && movie.similar.results.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Similar Movies
                  </h2>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {movie.similar.results.slice(0, 6).map((similarMovie) => (
                      <Link
                        key={similarMovie.id}
                        href={`/movies/${similarMovie.id}`}
                        className="group"
                      >
                        <div className="aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden mb-2 group-hover:scale-105 transition-transform">
                          <img
                            src={getImageUrl(similarMovie.poster_path)}
                            alt={similarMovie.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="text-xs font-medium text-white line-clamp-2 group-hover:text-purple-400">
                          {similarMovie.title}
                        </h3>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Movie Stats */}
              <div className="bg-gray-800 rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4">
                  Movie Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2 font-medium text-white">
                      {movie.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">Release Date:</span>
                    <span className="ml-2 font-medium text-white">
                      {new Date(movie.release_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">Original Language:</span>
                    <span className="ml-2 font-medium text-white uppercase">
                      {movie.original_language}
                    </span>
                  </div>

                  {movie.budget > 0 && (
                    <div>
                      <span className="text-gray-400">Budget:</span>
                      <span className="ml-2 font-medium text-white">
                        ${movie.budget.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {movie.revenue > 0 && (
                    <div>
                      <span className="text-gray-400">Revenue:</span>
                      <span className="ml-2 font-medium text-white">
                        ${movie.revenue.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {movie.homepage && (
                    <div>
                      <span className="text-gray-400">Homepage:</span>
                      <a
                        href={movie.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-purple-400 hover:text-purple-300 inline-flex items-center"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Companies */}
              {movie.production_companies &&
                movie.production_companies.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 shadow-md">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Production
                    </h3>
                    <div className="space-y-2">
                      {movie.production_companies.slice(0, 5).map((company) => (
                        <div key={company.id} className="text-gray-300">
                          {company.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* User Actions Summary */}
              {isAuthenticated && (
                <div className="bg-gray-800 rounded-lg p-6 shadow-md">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Your Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Bookmarked:</span>
                      <span
                        className={`font-medium ${
                          bookmarked ? "text-yellow-400" : "text-gray-500"
                        }`}
                      >
                        {bookmarked ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Watched:</span>
                      <span
                        className={`font-medium ${
                          watched ? "text-green-400" : "text-gray-500"
                        }`}
                      >
                        {watched ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
