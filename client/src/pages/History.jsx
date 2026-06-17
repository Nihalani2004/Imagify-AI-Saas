import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { motion } from "motion/react"
import { assets } from '../assets/assets'

const History = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const { backendUrl, token } = useContext(AppContext)

  // Fetch user's generation history
  const fetchHistory = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching history from:', `${backendUrl}/api/image/history`)
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token')
      
      const response = await fetch(`${backendUrl}/api/image/history`, {
        method: 'GET',
        headers: {
          'token': token
        }
      })
      
      const data = await response.json()
      console.log('📊 History response:', data)
      
      if (data.success) {
        setHistory(data.history)
        console.log('✅ History loaded:', data.history.length, 'items')
      } else {
        console.error('❌ Failed to fetch history:', data.message)
      }
    } catch (error) {
      console.error('🚨 Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  // Clear history
  const clearHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/image/history`, {
        method: 'DELETE',
        headers: {
          'token': token
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setHistory([])
        alert('History cleared successfully!')
      } else {
        alert('Failed to clear history')
      }
    } catch (error) {
      console.error('Error clearing history:', error)
      alert('Error clearing history')
    }
  }

  useEffect(() => {
    if (token) {
      fetchHistory()
    }
  }, [token])

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading your history...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{opacity:0, y:20}}
      animate={{opacity:1, y:0}}
      transition={{duration:0.5}}
      className="min-h-[80vh] py-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Generation History</h1>
            <p className="text-gray-600 mt-2">Your last {history.length} generated images</p>
          </div>
          
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        {/* History Grid */}
        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No History Yet</h2>
            <p className="text-gray-500 mb-6">Start generating images to see your history here!</p>
            <a 
              href="/" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Generate Your First Image
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{opacity:0, y:20}}
                animate={{opacity:1, y:0}}
                transition={{duration:0.3, delay:index * 0.1}}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedImage(item)}
              >
                {/* Image Preview */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img 
                    src={item.imageData} 
                    alt={item.prompt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Cache Badge */}
                  {item.fromCache && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Cached
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    "{item.prompt}"
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(item.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{scale:0.8, opacity:0}}
              animate={{scale:1, opacity:1}}
              className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                      "{selectedImage.prompt}"
                    </h2>
                    <p className="text-gray-500">
                      Generated on {formatDate(selectedImage.timestamp)}
                      {selectedImage.fromCache && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          From Cache
                        </span>
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Image */}
                <div className="mb-4">
                  <img 
                    src={selectedImage.imageData} 
                    alt={selectedImage.prompt}
                    className="w-full max-w-2xl mx-auto rounded-lg"
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 justify-center">
                  <a 
                    href={selectedImage.imageData} 
                    download={`imagify-${selectedImage.prompt.slice(0,20)}.png`}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Download
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedImage.prompt)
                      alert('Prompt copied to clipboard!')
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Copy Prompt
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default History