import uuid
from rag_engine import get_policy_answer

class Agent:
    def __init__(self, name, role, verifiable_credential):
        self.id = str(uuid.uuid4())
        self.name = name
        self.role = role
        self.credential = verifiable_credential 

    def verify_credential(self, other_agent):
        """Simulates checking a Zynd DID on the blockchain"""
        print(f"🕵️ {self.name} is verifying {other_agent.name}...")
        if other_agent.credential == "OFFICIAL_GOV_ACCESS":
            return True
        return False



class InterfaceAgent(Agent):
    """The Receptionist (Talks to User)"""
    def handle_request(self, user_query, policy_agent):
     
        is_verified = self.verify_credential(policy_agent)
        
        if not is_verified:
            return {"error": "Security Alert: Policy Agent not verified."}

      
        print(f"✅ Identity Verified. Handing off to {policy_agent.name}")
        response = policy_agent.process_query(user_query)
        return response

class PolicyAgent(Agent):
    """The Expert (Talks to Database)"""
    def process_query(self, query):
   
        answer = get_policy_answer(query)
        return {
            "agent_id": self.id,
            "status": "verified_response",
            "answer": answer
        }


frontend_bot = InterfaceAgent("CitizenAlly", "Interface", "BASIC_ACCESS")
backend_bot = PolicyAgent("GovOracle", "PolicyExpert", "OFFICIAL_GOV_ACCESS")