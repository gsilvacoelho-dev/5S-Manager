from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.user import Area, User, Cycle, AreaAssignment, db
import random
from datetime import datetime

areas_bp = Blueprint('areas', __name__)

def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            return jsonify({'error': 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@areas_bp.route('/', methods=['GET'])
@login_required
def get_areas():
    try:
        areas = Area.query.filter_by(is_active=True).all()
        return jsonify([area.to_dict() for area in areas]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/', methods=['POST'])
@login_required
@admin_required
def create_area():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        
        if not name:
            return jsonify({'error': 'Nome da área é obrigatório'}), 400
        
        # Verificar se área já existe
        if Area.query.filter_by(name=name, is_active=True).first():
            return jsonify({'error': 'Área com este nome já existe'}), 400
        
        area = Area(
            name=name,
            description=description
        )
        
        db.session.add(area)
        db.session.commit()
        
        return jsonify({
            'message': 'Área criada com sucesso',
            'area': area.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/<int:area_id>', methods=['GET'])
@login_required
def get_area(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        if not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        return jsonify(area.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/<int:area_id>', methods=['PUT'])
@login_required
@admin_required
def update_area(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        if not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        
        if name:
            # Verificar se outroo área já tem este nome
            existing_area = Area.query.filter_by(name=name, is_active=True).first()
            if existing_area and existing_area.id != area_id:
                return jsonify({'error': 'Área com este nome já existe'}), 400
            area.name = name
        
        if description is not None:
            area.description = description
        
        db.session.commit()
        
        return jsonify({
            'message': 'Área atualizada com sucesso',
            'area': area.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/<int:area_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_area(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        if not area.is_active:
            return jsonify({'error': 'Área não encontrada'}), 404
        
        # Soft delete - marcar como inativa
        area.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Área removida com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/draw', methods=['POST'])
@login_required
@admin_required
def draw_areas():
    """Realiza o sorteio automático de áreas para auditores"""
    try:
        # Verificar se existe um ciclo ativo
        active_cycle = Cycle.query.filter_by(is_active=True).first()
        if not active_cycle:
            return jsonify({'error': 'Não há ciclo ativo para realizar o sorteio'}), 400
        
        # Verificar se já existe sorteio para este ciclo
        existing_assignments = AreaAssignment.query.filter_by(cycle_id=active_cycle.id).first()
        if existing_assignments:
            return jsonify({'error': 'Já existe sorteio para o ciclo atual'}), 400
        
        # Buscar áreas ativas
        areas = Area.query.filter_by(is_active=True).all()
        if not areas:
            return jsonify({'error': 'Não há áreas cadastradas para sorteio'}), 400
        
        # Buscar auditores ativos
        auditors = User.query.filter_by(user_type='auditor', is_active=True).all()
        if not auditors:
            return jsonify({'error': 'Não há auditores disponíveis para sorteio'}), 400
        
        # Realizar o sorteio
        assignments = []
        area_index = 0
        
        # Embaralhar as áreas 
        random.shuffle(areas)
        
        for area in areas:
            # Se temos mais áreas que auditores, alguns auditores podem pegar mais de uma áreaa
            auditor = auditors[area_index % len(auditors)]
            
            assignment = AreaAssignment(
                area_id=area.id,
                auditor_id=auditor.id,
                cycle_id=active_cycle.id
            )
            
            db.session.add(assignment)
            assignments.append({
                'area_name': area.name,
                'auditor_name': auditor.username,
                'area_id': area.id,
                'auditor_id': auditor.id
            })
            
            area_index += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Sorteio realizado com sucesso',
            'assignments': assignments,
            'total_areas': len(areas),
            'total_auditors': len(auditors)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/assignments', methods=['GET'])
@login_required
def get_assignments():
    """Busca as atribuições de áreas do ciclo atual"""
    try:
        # Buscar ciclo ativo
        active_cycle = Cycle.query.filter_by(is_active=True).first()
        if not active_cycle:
            return jsonify({'assignments': []}), 200
        
        # Se for auditor, mostrar apenas suas atribuições
        if current_user.is_auditor():
            assignments = db.session.query(AreaAssignment, Area, User).join(
                Area, AreaAssignment.area_id == Area.id
            ).join(
                User, AreaAssignment.auditor_id == User.id
            ).filter(
                AreaAssignment.cycle_id == active_cycle.id,
                AreaAssignment.auditor_id == current_user.id
            ).all()
        else:
            # Se for admin, mostrar todas as atribuições
            assignments = db.session.query(AreaAssignment, Area, User).join(
                Area, AreaAssignment.area_id == Area.id
            ).join(
                User, AreaAssignment.auditor_id == User.id
            ).filter(
                AreaAssignment.cycle_id == active_cycle.id
            ).all()
        
        result = []
        for assignment, area, auditor in assignments:
            result.append({
                'assignment_id': assignment.id,
                'area_id': area.id,
                'area_name': area.name,
                'area_description': area.description,
                'auditor_id': auditor.id,
                'auditor_name': auditor.username,
                'assigned_at': assignment.assigned_at.isoformat() if assignment.assigned_at else None
            })
        
        return jsonify({
            'assignments': result,
            'cycle': active_cycle.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@areas_bp.route('/assignments/<int:cycle_id>', methods=['GET'])
@login_required
def get_assignments_by_cycle(cycle_id):
    """Busca as atribuições de áreas de um ciclo específico"""
    try:
        # Verificar se o ciclo existe
        cycle = Cycle.query.get(cycle_id)
        if not cycle:
            return jsonify({'error': 'Ciclo não encontrado'}), 404
        
        # Buscar atribuições do ciclo
        assignments = db.session.query(
            AreaAssignment, Area, User
        ).join(
            Area, AreaAssignment.area_id == Area.id
        ).join(
            User, AreaAssignment.auditor_id == User.id
        ).filter(
            AreaAssignment.cycle_id == cycle_id
        ).all()
        
        result = []
        for assignment, area, auditor in assignments:
            result.append({
                'assignment_id': assignment.id,
                'area_id': area.id,
                'area_name': area.name,
                'area_description': area.description,
                'auditor_id': auditor.id,
                'auditor_name': auditor.username,
                'assigned_at': assignment.assigned_at.isoformat() if assignment.assigned_at else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
