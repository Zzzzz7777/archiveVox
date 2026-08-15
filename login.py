import bcrypt
from database import supabase

def validate_user(username: str, password: str) -> dict:
    """
    Validate user credentials against Supabase database.
    
    Args:
        username: The username to look up
        password: The plain text password to verify
        
    Returns:
        dict: {'success': True, 'user': user_data} on success
              {'success': False, 'message': error_message} on failure
    """
    try:
        # Query the user table for the given username
        response = supabase.table('user').select('*').eq('username', username).execute()
        
        # Check if user exists
        if not response.data or len(response.data) == 0:
            return {
                'success': False,
                'message': 'User not found'
            }
        
        user = response.data[0]
        stored_password_hash = user.get('password')
        
        if not stored_password_hash:
            return {
                'success': False,
                'message': 'Invalid user data'
            }
        
        # Debug: Check the format of the stored password
        print(f"Stored password type: {type(stored_password_hash)}")
        print(f"Stored password first 50 chars: {str(stored_password_hash)[:50]}")
        
        # Check if the password is plain text (for testing/development)
        if isinstance(stored_password_hash, str) and not stored_password_hash.startswith('$2b$') and not stored_password_hash.startswith('$2a$'):
            # Assume plain text comparison (NOT SECURE - for development only)
            if stored_password_hash == password:
                user_data = {
                    'username': user.get('username'),
                    'id': user.get('id'),
                    'role': user.get('role')
                }
                return {
                    'success': True,
                    'user': user_data
                }
            else:
                return {
                    'success': False,
                    'message': 'Invalid password'
                }
        
        # Verify the password using bcrypt
        # bcrypt expects bytes, so encode the password
        if isinstance(stored_password_hash, str):
            stored_password_hash = stored_password_hash.encode('utf-8')
        
        password_bytes = password.encode('utf-8')
        
        if bcrypt.checkpw(password_bytes, stored_password_hash):
            # Password matches, return user data (excluding password)
            user_data = {
                'username': user.get('username'),
                'id': user.get('id'),
                'role': user.get('role')
            }
            return {
                'success': True,
                'user': user_data
            }
        else:
            return {
                'success': False,
                'message': 'Invalid password'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Database error: {str(e)}'
        }
