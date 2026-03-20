from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from src.models.user import User, db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username e senha são obrigatórios'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password) and user.is_active:
            login_user(user)
            return jsonify({
                'message': 'Login realizado com sucesso',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Credenciais inválidas'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    try:
        logout_user()
        return jsonify({'message': 'Logout realizado com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        user_type = data.get('user_type', 'auditor')
        
        if not username or not email or not password:
            return jsonify({'error': 'Todos os campos são obrigatórios'}), 400
        
        if user_type not in ['admin', 'auditor']:
            return jsonify({'error': 'Tipo de usuário inválido'}), 400
        
        # Verificar se usuário já existe
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Nome de usuário já existe'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já está em uso'}), 400
        
        # Criar novo usuário
        user = User(
            username=username,
            email=email,
            user_type=user_type
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    try:
        return jsonify({
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/check-auth', methods=['GET'])
def check_auth():
    try:
        if current_user.is_authenticated:
            return jsonify({
                'authenticated': True,
                'user': current_user.to_dict()
            }), 200
        else:
            return jsonify({
                'authenticated': False
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@auth_bp.route('/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    """Listar todos os usuários (apenas para admins)"""
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@login_required
@admin_required
def toggle_user_status(user_id):
    """Ativar/desativar usuário (apenas para admins)"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Não permitir desativar o próprio usuário
        if user.id == current_user.id:
            return jsonify({'error': 'Você não pode alterar o status do seu próprio usuário'}), 400
        
        # Não permitir desativar o usuário admin principal
        if user.username == 'admin':
            return jsonify({'error': 'Não é possível alterar o status do usuário admin principal'}), 400
        
        user.is_active = not user.is_active
        db.session.commit()
        
        status = 'ativado' if user.is_active else 'desativado'
        return jsonify({
            'message': f'Usuário {user.username} foi {status} com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """Excluir usuário (apenas para admins)"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Não permitir excluir o próprio usuário
        if user.id == current_user.id:
            return jsonify({'error': 'Você não pode excluir seu próprio usuário'}), 400
        
        # Não permitir excluir o usuário admin principal
        if user.username == 'admin':
            return jsonify({'error': 'Não é possível excluir o usuário admin principal'}), 400
        
        # Importar modelos necessários para remover as dependências
        from src.models.user import AreaAssignment, Evaluation
        
        # Remover todas as atribuições de áreas do usuário
        AreaAssignment.query.filter_by(auditor_id=user_id).delete()
        
        # Remover todas as avaliações do usuário
        Evaluation.query.filter_by(auditor_id=user_id).delete()
        
        username = user.username
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': f'Usuário {username} foi excluído com sucesso'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

