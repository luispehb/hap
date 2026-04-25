import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Splash } from './screens/Splash'
import { Step1Identity } from './screens/onboarding/Step1Identity'
import { Step2Interests } from './screens/onboarding/Step2Interests'
import { Step3Question } from './screens/onboarding/Step3Question'
import { Step4Location } from './screens/onboarding/Step4Location'
import { Feed } from './screens/Feed'
import { CreatePlan } from './screens/CreatePlan'
import { PlanDetail } from './screens/PlanDetail'
import { Profile } from './screens/Profile'
import { EditProfile } from './screens/EditProfile'
import { Chat } from './screens/Chat'
import { Rating } from './screens/Rating'
import { Journal } from './screens/Journal'
import { Connections } from './screens/Connections'
import { Admin } from './screens/Admin'
import { Chats } from './screens/Chats'
import { DirectChat } from './screens/DirectChat'
import { Invite } from './screens/Invite'
import { Notifications } from './screens/Notifications'

function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-sand flex justify-center">
            <div className="w-full max-w-[430px] bg-cream min-h-screen relative overflow-x-hidden">
              <Routes>
                <Route path="/" element={<Splash />} />
                <Route path="/onboarding" element={<Step1Identity />} />
                <Route path="/onboarding/2" element={<Step2Interests />} />
                <Route path="/onboarding/3" element={<Step3Question />} />
                <Route path="/onboarding/4" element={<Step4Location />} />
                <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                <Route path="/create-plan" element={<ProtectedRoute><CreatePlan /></ProtectedRoute>} />
                <Route path="/plan/:planId" element={<ProtectedRoute><PlanDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/chat/:planId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/rate/:planId" element={<ProtectedRoute><Rating /></ProtectedRoute>} />
                <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
                <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/direct/:profileId" element={<ProtectedRoute><DirectChat /></ProtectedRoute>} />
                <Route path="/invite/:code" element={<Invite />} />
                <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
  )
}

export default App
